/**
 * Football Pro 2026 - Virtual Remote Gamepad
 * Touch Joysticks, Button State Emitters & Haptic Feedback Relays
 */

(function() {
  'use strict';

  let socket = null;
  let roomCode = '';
  
  // Joystick Touch State
  const joystick = {
    active: false,
    startX: 0,
    startY: 0,
    knob: null,
    boundary: null,
    limit: 45 // max radius offset pixels
  };

  function initController() {
    joystick.knob = document.getElementById('joystick-knob');
    joystick.boundary = document.getElementById('joystick-boundary');
    
    // Parse URL room code
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room) {
      roomCode = room.toUpperCase().trim();
      connectToRoom();
    } else {
      // Show pairing overlay
      document.getElementById('lobby-pairing').style.display = 'flex';
      setupPairingForm();
    }
  }

  function setupPairingForm() {
    const input = document.getElementById('room-code-input');
    const btn = document.getElementById('connect-btn');
    const err = document.getElementById('pairing-error');

    btn.onclick = () => {
      const val = input.value.trim().toUpperCase();
      if (val.length !== 4) {
        err.innerText = "Please enter a valid 4-character code.";
        return;
      }
      roomCode = val;
      connectToRoom();
    };
  }

  function connectToRoom() {
    if (socket) return;
    
    // Connect to local Node socket
    socket = io();

    socket.on('connect', () => {
      console.log("Controller socket connected. Joining room:", roomCode);
      socket.emit('join-room-phone', { roomCode });
    });

    socket.on('phone-joined', ({ phoneSlot, layout }) => {
      // Hide pairing overlay
      document.getElementById('lobby-pairing').style.display = 'none';
      
      updateConnectionStatus(true);
      console.log(`Paired successfully! Assigned slot: ${phoneSlot}. Layout: ${layout}`);
      
      // Request vibration verification
      vibrateDevice(80);
    });

    socket.on('phone-rejoined', ({ phoneSlot, layout }) => {
      document.getElementById('lobby-pairing').style.display = 'none';
      updateConnectionStatus(true);
      console.log(`Rejoined successfully! Slot: ${phoneSlot}`);
      vibrateDevice(80);
    });

    socket.on('room-error', (msg) => {
      console.warn("Connection error:", msg);
      document.getElementById('lobby-pairing').style.display = 'flex';
      document.getElementById('pairing-error').innerText = msg;
      
      // Cleanup socket
      socket.disconnect();
      socket = null;
    });

    socket.on('pc-disconnected', () => {
      console.warn("Game client disconnected.");
      updateConnectionStatus(false);
      
      // Disconnect and show error
      socket.disconnect();
      socket = null;
      document.getElementById('lobby-pairing').style.display = 'flex';
      document.getElementById('pairing-error').innerText = "Game session ended by PC.";
    });

    // Listen for custom vibration triggers (e.g. on goals scored or big tackles!)
    socket.on('trigger-vibration', (data) => {
      if (data && data.pattern) {
        vibrateDevice(data.pattern);
      }
    });

    // Initialize physical input handlers once socket is set up
    setupGamepadButtons();
    setupTouchJoystick();
  }

  function updateConnectionStatus(isConnected) {
    const statusLabel = document.getElementById('status-label');
    const roomText = document.getElementById('room-code-text');
    const statusLight = document.getElementById('status-light');

    if (isConnected) {
      if (statusLabel) statusLabel.innerText = "CONNECTED";
      if (roomText) roomText.innerText = `ROOM: ${roomCode}`;
      if (statusLight) {
        statusLight.style.backgroundColor = '#10b981'; // Green neon glow
        statusLight.style.boxShadow = '0 0 12px #10b981';
      }
    } else {
      if (statusLabel) statusLabel.innerText = "DISCONNECTED";
      if (statusLight) {
        statusLight.style.backgroundColor = '#ef4444'; // Red glow
        statusLight.style.boxShadow = '0 0 10px #ef4444';
      }
    }
  }

  // ── TOUCH JOYSTICK ENGINE ──
  function setupTouchJoystick() {
    const el = joystick.boundary;
    if (!el) return;

    el.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      joystick.active = true;
      
      // Get starting absolute coordinate
      const rect = el.getBoundingClientRect();
      joystick.startX = rect.left + rect.width / 2;
      joystick.startY = rect.top + rect.height / 2;
      
      updateJoystickPosition(t.clientX, t.clientY);
    }, { passive: true });

    el.addEventListener('touchmove', (e) => {
      if (!joystick.active) return;
      const t = e.touches[0];
      updateJoystickPosition(t.clientX, t.clientY);
    }, { passive: true });

    const stopJoystick = () => {
      if (!joystick.active) return;
      joystick.active = false;
      
      // Reset knob visual
      joystick.knob.style.transform = 'translate(-50%, -50%)';
      
      // Send zero input
      emitControllerInput({
        type: 'joystick',
        x: 0,
        y: 0
      });
    };

    el.addEventListener('touchend', stopJoystick);
    el.addEventListener('touchcancel', stopJoystick);
  }

  function updateJoystickPosition(clientX, clientY) {
    const dx = clientX - joystick.startX;
    const dy = clientY - joystick.startY;
    const dist = Math.hypot(dx, dy);
    
    const angle = Math.atan2(dy, dx);
    const clampDist = Math.min(dist, joystick.limit);

    // Render knob position visual
    const visualX = Math.cos(angle) * clampDist;
    const visualY = Math.sin(angle) * clampDist;
    joystick.knob.style.transform = `translate(calc(-50% + ${visualX}px), calc(-50% + ${visualY}px))`;

    // Send input: normalize coordinates between -1.0 and 1.0
    const normX = Math.cos(angle) * (clampDist / joystick.limit);
    const normY = Math.sin(angle) * (clampDist / joystick.limit);
    
    emitControllerInput({
      type: 'joystick',
      x: Number(normX.toFixed(3)),
      y: Number(normY.toFixed(3))
    });
  }

  // ── GAMEPAD VIRTUAL BUTTONS ──
  function setupGamepadButtons() {
    const buttonMapping = [
      { id: 'btn-cross', key: 'cross' },      // Pass
      { id: 'btn-circle', key: 'circle' },    // Shoot
      { id: 'btn-square', key: 'square' },    // Tackle
      { id: 'btn-triangle', key: 'triangle' },// Lob
      { id: 'btn-r1', key: 'r1' },            // Sprint
      { id: 'btn-l1', key: 'l1' }             // Secondary
    ];

    buttonMapping.forEach(cfg => {
      const el = document.getElementById(cfg.id);
      if (!el) return;

      const triggerDown = (e) => {
        e.preventDefault();
        el.classList.add('pressed');
        
        emitControllerInput({
          type: 'btnDown',
          btn: cfg.key
        });
        
        vibrateDevice(35); // subtle click buzz
      };

      const triggerUp = () => {
        el.classList.remove('pressed');
        
        emitControllerInput({
          type: 'btnUp',
          btn: cfg.key
        });
      };

      el.addEventListener('touchstart', triggerDown, { passive: false });
      el.addEventListener('touchend', triggerUp);
      el.addEventListener('touchcancel', triggerUp);
    });
  }

  function emitControllerInput(payload) {
    if (socket && socket.connected) {
      socket.emit('controller-input', payload);
    }
  }

  function vibrateDevice(pattern) {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {}
    }
  }

  window.onload = initController;

})();
