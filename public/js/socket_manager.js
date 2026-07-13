// ── SOCKET MANAGER ──────────────────────────────────────────────
// Handles WebSocket (Socket.IO) connection and phone controller input.

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

let lastJoystickDir = 0;
let lastJoystickYDir = 0;

function initSocket() {
  if (window.socket) return; // Already initialized

  window.socket = io();

  window.socket.on('connect', () => {
    console.log('PC connected to Node WebSocket Server');
    window.socket.emit('join-room-pc');
    if (typeof window.updatePresence === 'function') {
      window.updatePresence('Idle');
    }
  });

  window.socket.on('room-created', ({ roomCode: code, localIp, port }) => {
    window.roomCode = code;

    // Smart URL routing: use Wi-Fi IP on localhost, and origin domain on public hosted servers
    let phoneUrl;
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '') {
      phoneUrl = `http://${localIp}:${port}/controller.html?room=${code}`;
    } else {
      phoneUrl = `${window.location.origin}/controller.html?room=${code}`;
    }

    // 1. Update the old PvP lobby elements (if they exist)
    if (window.ui && window.ui.roomCodeText) window.ui.roomCodeText.innerText = code;
    if (window.ui && window.ui.qrImage) {
      window.ui.qrImage.src = `/qrcode?text=${encodeURIComponent(phoneUrl)}`;
      window.ui.qrImage.onload = () => {
        if (window.ui.qrSpinner) window.ui.qrSpinner.style.display = 'none';
        if (window.ui.qrImageWrapper) window.ui.qrImageWrapper.style.display = 'flex';
      };
    }
    if (window.ui && window.ui.statusDot) window.ui.statusDot.classList.remove('connected');
    if (window.ui && window.ui.statusLabel) window.ui.statusLabel.innerText = 'Waiting for phone connection...';

    // 2. Update the new Dashboard Controller modal elements
    const ctrlRoom = document.getElementById('ps5-controller-room-val');
    const ctrlQr = document.getElementById('ps5-controller-qr-img');
    const ctrlSpinner = document.getElementById('ps5-controller-qr-spinner');
    if (ctrlRoom) ctrlRoom.innerText = code;
    if (ctrlQr) {
      ctrlQr.src = `/qrcode?text=${encodeURIComponent(phoneUrl)}`;
      ctrlQr.onload = () => {
        if (ctrlSpinner) ctrlSpinner.style.display = 'none';
        ctrlQr.style.display = 'block';
      };
    }
    
    console.log(`Lobby room code assigned: ${code}`);
  });

  window.socket.on('phone-connected', ({ phoneSlot }) => {
    window.controllerConnected = true;

    // 1. Update the new Dashboard Controller modal status indicator
    const ctrlStatusDot = document.getElementById('ps5-controller-status-dot');
    const ctrlStatusText = document.getElementById('ps5-controller-status-text');
    if (ctrlStatusDot) {
      ctrlStatusDot.style.background = '#10b981';
      ctrlStatusDot.style.boxShadow = '0 0 10px #10b981';
    }
    if (ctrlStatusText) {
      ctrlStatusText.innerText = 'Controller connected!';
      ctrlStatusText.style.color = '#10b981';
    }

    // 2. Update the old PvP lobby status (if it exists)
    if (window.ui && window.ui.statusDot) window.ui.statusDot.classList.add('connected');
    if (window.ui && window.ui.statusLabel) window.ui.statusLabel.innerText = `Phone connected! Controller paired.`;

    // 3. Auto-close the dashboard Controller QR modal if open
    const ctrlModal = document.getElementById('ps5-controller-modal');
    if (ctrlModal && ctrlModal.classList.contains('show')) {
      setTimeout(() => {
        ctrlModal.classList.remove('show');
      }, 1000);
    }

    // 4. Force mobile controller layout sync depending on active match state
    const isBatting = window.MATCH && window.MATCH.userIsBatting;
    window.socket.emit('layout-change', { layout: isBatting ? 'batting' : 'bowling' });

    // 5. If PvP lobby screen is active, auto-trigger PvP match load
    const lobbyEl = window.ui && window.ui.lobby;
    if (lobbyEl && !lobbyEl.classList.contains('hidden')) {
      setTimeout(() => {
        lobbyEl.classList.add('hidden');
        if (typeof window.triggerMatchLoading === 'function') {
          window.triggerMatchLoading(() => {
            if (window.ui && window.ui.hud) window.ui.hud.style.display = 'flex';
            if (window.ui && window.ui.hudMode) window.ui.hudMode.innerText = 'PVP DUEL';
            window.matchMode = window.MODES.PVP;
            if (typeof window.restartMatch === 'function') window.restartMatch();
          });
        }
      }, 1200);
    }
  });

  window.socket.on('phone-disconnected', () => {
    window.controllerConnected = false;

    // Reset Dashboard Controller Modal status
    const ctrlStatusDot = document.getElementById('ps5-controller-status-dot');
    const ctrlStatusText = document.getElementById('ps5-controller-status-text');
    if (ctrlStatusDot) {
      ctrlStatusDot.style.background = '#ef4444';
      ctrlStatusDot.style.boxShadow = '0 0 10px #ef4444';
    }
    if (ctrlStatusText) {
      ctrlStatusText.innerText = 'No phone controller linked';
      ctrlStatusText.style.color = 'rgba(255, 255, 255, 0.7)';
    }

    // Reset old PvP lobby elements (if they exist)
    if (window.ui && window.ui.statusDot) window.ui.statusDot.classList.remove('connected');
    if (window.ui && window.ui.statusLabel) window.ui.statusLabel.innerText = 'Controller Disconnected. Reconnecting...';

    if (window.matchMode === window.MODES.PVP && window.gameState !== window.STATES.GAME_OVER) {
      if (window.ui && window.ui.lobby) window.ui.lobby.classList.remove('hidden');
      if (window.ui && window.ui.hud) window.ui.hud.style.display = 'none';
      if (typeof window.setGameState === 'function') window.setGameState(window.STATES.WAITING_FOR_PHONE);
    }
  });

  window.socket.on('controller-input', (data) => {
    if (data.type === 'joystick') {
      window.controllerInput.joystickX = data.x;
      window.controllerInput.joystickY = data.y;

      // Only perform dashboard console navigation if the game hasn't launched (dashboard root exists)
      const consoleRoot = document.getElementById('ps5-console-root');
      const isLobbyActive = window.ui && window.ui.lobby && !window.ui.lobby.classList.contains('hidden');
      
      if (consoleRoot && !isLobbyActive) {
        // Horizontal left-right game shelf navigation
        if (data.x < -0.5) {
          if (lastJoystickDir !== -1) {
            lastJoystickDir = -1;
            if (typeof window.handleInputNavigation === 'function') {
              window.handleInputNavigation(-1);
            }
          }
        } else if (data.x > 0.5) {
          if (lastJoystickDir !== 1) {
            lastJoystickDir = 1;
            if (typeof window.handleInputNavigation === 'function') {
              window.handleInputNavigation(1);
            }
          }
        } else if (Math.abs(data.x) < 0.2) {
          lastJoystickDir = 0;
        }

        // Vertical Up/Down header tab navigation
        if (data.y < -0.5) {
          if (lastJoystickYDir !== -1) {
            lastJoystickYDir = -1;
            const tabGames = document.getElementById('nav-item-games');
            if (tabGames) tabGames.click();
          }
        } else if (data.y > 0.5) {
          if (lastJoystickYDir !== 1) {
            lastJoystickYDir = 1;
            const tabStore = document.getElementById('nav-item-store');
            if (tabStore) tabStore.click();
          }
        } else if (Math.abs(data.y) < 0.2) {
          lastJoystickYDir = 0;
        }
      } else {
        // Game has launched: route joystick vertical movement to menu up/down
        if (data.y < -0.5) {
          if (lastJoystickYDir !== -1) {
            lastJoystickYDir = -1;
            if (typeof window.handleUINavigation === 'function') window.handleUINavigation('UP');
          }
        } else if (data.y > 0.5) {
          if (lastJoystickYDir !== 1) {
            lastJoystickYDir = 1;
            if (typeof window.handleUINavigation === 'function') window.handleUINavigation('DOWN');
          }
        } else if (Math.abs(data.y) < 0.2) {
          lastJoystickYDir = 0;
        }
      }

    } else if (data.type === 'aim-joystick') {
      window.controllerInput.aimX = data.x;
      window.controllerInput.aimY = data.y;

    } else if (data.type === 'btnDown') {
      updateButtonState(data.btn, true);

      // Dashboard overlay navigation buttons mapping
      const consoleRoot = document.getElementById('ps5-console-root');
      const isLobbyActive = window.ui && window.ui.lobby && !window.ui.lobby.classList.contains('hidden');

      if (consoleRoot && !isLobbyActive) {
        if (data.btn === 'cross') {
          // Close QR Modal if currently scanning/pairing
          const ctrlModal = document.getElementById('ps5-controller-modal');
          if (ctrlModal && ctrlModal.classList.contains('show')) {
            ctrlModal.classList.remove('show');
          } else {
            // Click to launch the selected game card
            if (typeof window.launchActiveGame === 'function') {
              window.launchActiveGame();
            }
          }
        } else if (data.btn === 'circle') {
          // Circle acts as a 'Back' button to close open modals
          const ctrlModal = document.getElementById('ps5-controller-modal');
          if (ctrlModal) ctrlModal.classList.remove('show');
          const profModal = document.getElementById('ps5-profile-modal');
          if (profModal) profModal.classList.remove('show');
        } else if (data.btn === 'dpadLeft') {
          if (typeof window.handleInputNavigation === 'function') window.handleInputNavigation(-1);
        } else if (data.btn === 'dpadRight') {
          if (typeof window.handleInputNavigation === 'function') window.handleInputNavigation(1);
        } else if (data.btn === 'dpadUp') {
          const tabGames = document.getElementById('nav-item-games');
          if (tabGames) tabGames.click();
        } else if (data.btn === 'dpadDown') {
          const tabStore = document.getElementById('nav-item-store');
          if (tabStore) tabStore.click();
        }
      } else {
        // Game has launched: route D-pad and action button presses to menu navigation
        if (typeof window.handleUINavigation === 'function') {
          if (data.btn === 'dpadUp') window.handleUINavigation('UP');
          if (data.btn === 'dpadDown') window.handleUINavigation('DOWN');
          if (data.btn === 'dpadLeft') window.handleUINavigation('LEFT');
          if (data.btn === 'dpadRight') window.handleUINavigation('RIGHT');
          if (data.btn === 'cross') window.handleUINavigation('SELECT');
          if (data.btn === 'circle') window.handleUINavigation('BACK');
        }
      }

      if (data.btn === 'cross' || data.btn === 'triangle' || data.btn === 'circle' || data.btn === 'square') {
        if (typeof window.triggerBatSwing === 'function') window.triggerBatSwing();
      }
    } else if (data.type === 'btnUp') {
      updateButtonState(data.btn, false);
    }
  });
}

window.initSocket       = initSocket;
window.updateButtonState = updateButtonState;

window.updatePresence = function(activity, roomCode) {
  if (window.currentUser && window.profile) {
    if (window.socket && window.socket.connected) {
      window.socket.emit('presence-update', {
        uid: window.currentUser.uid,
        username: window.profile.username || 'Gamer',
        activity: activity || 'Idle',
        roomCode: roomCode || window.roomCode || null
      });
    }
  }
};

window.vibrateController = function(patternOrDuration = 200) {
  // 1. Vibrate physical gamepad if supported
  if (navigator.getGamepads) {
    const gamepads = navigator.getGamepads();
    for (let i = 0; i < gamepads.length; i++) {
      const gp = gamepads[i];
      if (gp) {
        const actuator = gp.vibrationActuator || gp.vibrationEffect;
        if (actuator && typeof actuator.playEffect === 'function') {
          actuator.playEffect("dual-rumble", {
            startDelay: 0,
            duration: typeof patternOrDuration === 'number' ? patternOrDuration : 300,
            weakMagnitude: 1.0,
            strongMagnitude: 1.0
          }).catch((err) => {
            console.warn("Gamepad vibration failed:", err);
          });
        }
      }
    }
  }

  // 2. Vibrate connected phone controller via Socket.io
  if (window.socket && window.socket.emit) {
    window.socket.emit('trigger-vibration', { pattern: patternOrDuration });
  }

  // 3. Vibrate local mobile browser if playing directly on phone
  if (navigator.vibrate) {
    try {
      navigator.vibrate(patternOrDuration);
    } catch (e) {}
  }
};
