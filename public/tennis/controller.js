let socket = null;
let roomCode = '';
let playerSlot = null; // 'PLAYER_1' or 'PLAYER_2' or auto
let phoneSlotNum = 1;

const ui = {
  loader: document.getElementById('loader-screen'),
  roomInput: document.getElementById('room-input'),
  joinBtn: document.getElementById('join-btn'),
  roomError: document.getElementById('room-error'),
  statusInd: document.getElementById('status-ind'),
  statusText: document.getElementById('status-text'),
  roomDisplay: document.getElementById('room-display-code'),
  playerIndicator: document.getElementById('player-indicator')
};

// Handle slot-selector button clicks on connection fallback screen
document.querySelectorAll('.slot-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    playerSlot = btn.getAttribute('data-slot');
  });
});

// Default playerSlot is selected active button
const activeSlotBtn = document.querySelector('.slot-btn.active');
if (activeSlotBtn) {
  playerSlot = activeSlotBtn.getAttribute('data-slot');
}

// ── VIBRATION HAPTICS ──────────────────────────────────────────
function triggerHaptic(duration = 20) {
  if (navigator.vibrate) {
    try {
      navigator.vibrate(duration);
    } catch (e) {}
  }
}

// ── REQUEST FULLSCREEN ─────────────────────────────────────────
function enterFullscreen() {
  try {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      const req = document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen;
      if (req) {
        req.call(document.documentElement).catch(() => {});
      }
    }
  } catch (e) {}
}

// ── GET URL PARAMETERS ──────────────────────────────────────────
function getUrlParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

// ── SOCKET INITIALIZATION & RECONNECT ──────────────────────────
function initSocket() {
  socket = io();

  socket.on('connect', () => {
    console.log('Tennis controller connected to WebSocket server');
    
    const storedRoom = sessionStorage.getItem('tennisActiveRoomCode');
    const storedSlot = sessionStorage.getItem('tennisActivePlayerSlot');
    
    // Check URL parameters first
    const urlRoom = getUrlParam('room');
    const urlSlot = getUrlParam('slot');

    if (urlRoom) {
      roomCode = urlRoom.toUpperCase().trim();
      playerSlot = urlSlot || playerSlot;
      sessionStorage.setItem('tennisActiveRoomCode', roomCode);
      sessionStorage.setItem('tennisActivePlayerSlot', playerSlot);
      joinRoom(roomCode, playerSlot);
    } else if (storedRoom) {
      roomCode = storedRoom;
      playerSlot = storedSlot || playerSlot;
      joinRoom(roomCode, playerSlot);
    }
  });

  socket.on('phone-joined', ({ roomCode: code, phoneSlot }) => {
    onJoinSuccess(code, phoneSlot);
  });

  socket.on('phone-rejoined', ({ roomCode: code, phoneSlot }) => {
    onJoinSuccess(code, phoneSlot);
  });

  socket.on('room-error', (msg) => {
    if (ui.roomError) ui.roomError.innerText = msg;
    triggerHaptic([50, 50]);
    sessionStorage.removeItem('tennisActiveRoomCode');
  });

  socket.on('trigger-vibration', (data) => {
    if (data && data.slot && data.slot !== playerSlot) return;
    const pattern = (data && data.pattern) ? data.pattern : 200;
    triggerHaptic(pattern);
  });

  socket.on('pc-disconnected', () => {
    updateStatus('DISCONNECTED (PC Left)', '#ef4444');
    sessionStorage.removeItem('tennisActiveRoomCode');
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  });

  socket.on('disconnect', () => {
    updateStatus('RECONNECTING...', '#eab308');
  });

  socket.on('reconnect', () => {
    if (roomCode) {
      socket.emit('rejoin-room-phone', { roomCode, slot: playerSlot });
    }
  });
}

function joinRoom(code, slot) {
  if (!code || code.length < 4) {
    if (ui.roomError) ui.roomError.innerText = 'Please enter a valid 4-character code.';
    return;
  }
  if (ui.roomError) ui.roomError.innerText = '';
  
  socket.emit('join-room-phone', { roomCode: code, slot: slot });
}

function onJoinSuccess(code, slotNum) {
  roomCode = code;
  phoneSlotNum = slotNum;
  sessionStorage.setItem('tennisActiveRoomCode', code);
  
  // Set slot mapping based on index number if not explicitly specified
  if (!playerSlot) {
    playerSlot = slotNum === 1 ? 'PLAYER_1' : 'PLAYER_2';
  }
  sessionStorage.setItem('tennisActivePlayerSlot', playerSlot);

  if (ui.roomDisplay) ui.roomDisplay.innerText = `ROOM: ${code}`;
  if (ui.loader) ui.loader.classList.add('hidden');
  updateStatus('CONNECTED', '#10b981');
  
  // Set theme colors based on player slot
  const isP1 = (playerSlot === 'PLAYER_1');
  if (ui.playerIndicator) {
    ui.playerIndicator.innerText = isP1 ? 'PLAYER 1 (LEFT)' : 'PLAYER 2 (RIGHT)';
    ui.playerIndicator.className = isP1 ? 'player-indicator p1-theme' : 'player-indicator p2-theme';
  }
  
  const stickBase = document.getElementById('left-stick-boundary');
  if (stickBase) {
    stickBase.className = isP1 ? 'thumbstick-base p1-stick-theme' : 'thumbstick-base p2-stick-theme';
  }

  triggerHaptic([60, 40, 60]); // success paired feedback
  enterFullscreen();
}

function updateStatus(text, colorHex) {
  if (ui.statusText) ui.statusText.innerText = text;
  if (ui.statusInd) {
    ui.statusInd.style.backgroundColor = colorHex;
    ui.statusInd.style.boxShadow = `0 0 10px ${colorHex}`;
  }
}

// ── VIRTUAL STICK CLASS ─────────────────────────────────────────
class VirtualStick {
  constructor(knobId, boundaryId) {
    this.knob = document.getElementById(knobId);
    this.boundary = document.getElementById(boundaryId);
    this.activeTouchId = null;
    this.isMouseDown = false;
    this.center = { x: 0, y: 0 };
    this.maxRadius = 45;

    if (this.knob && this.boundary) {
      this.init();
    }
  }

  init() {
    const passiveOpts = { passive: false };

    this.boundary.addEventListener('touchstart', (e) => {
      if (!e.targetTouches || e.targetTouches.length === 0) return;
      e.preventDefault();
      const touch = e.targetTouches[0];
      this.activeTouchId = touch.identifier;

      const rect = this.boundary.getBoundingClientRect();
      this.center.x = rect.left + rect.width / 2;
      this.center.y = rect.top + rect.height / 2;

      this.updatePosition(touch.clientX, touch.clientY);
    }, passiveOpts);

    this.boundary.addEventListener('touchmove', (e) => {
      if (this.activeTouchId === null) return;
      e.preventDefault();
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === this.activeTouchId) {
          this.updatePosition(e.touches[i].clientX, e.touches[i].clientY);
          break;
        }
      }
    }, passiveOpts);

    const stopHandler = (e) => {
      e.preventDefault();
      this.reset();
    };

    this.boundary.addEventListener('touchend', stopHandler, passiveOpts);
    this.boundary.addEventListener('touchcancel', stopHandler, passiveOpts);

    // Mouse support
    this.boundary.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.isMouseDown = true;

      const rect = this.boundary.getBoundingClientRect();
      this.center.x = rect.left + rect.width / 2;
      this.center.y = rect.top + rect.height / 2;

      this.updatePosition(e.clientX, e.clientY);
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isMouseDown) return;
      this.updatePosition(e.clientX, e.clientY);
    });

    window.addEventListener('mouseup', () => {
      if (this.isMouseDown) {
        this.isMouseDown = false;
        this.reset();
      }
    });
  }

  updatePosition(touchX, touchY) {
    let dx = touchX - this.center.x;
    let dy = touchY - this.center.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > this.maxRadius) {
      dx = (dx / dist) * this.maxRadius;
      dy = (dy / dist) * this.maxRadius;
    }

    this.knob.style.transform = `translate(${dx}px, ${dy}px)`;

    const normalizedX = parseFloat((dx / this.maxRadius).toFixed(2));
    const normalizedY = parseFloat((dy / this.maxRadius).toFixed(2));

    sendInput('joystick', { x: normalizedX, y: normalizedY });
  }

  reset() {
    this.activeTouchId = null;
    this.knob.style.transform = 'translate(0px, 0px)';
    sendInput('joystick', { x: 0, y: 0 });
  }
}

// ── TENNIS BUTTON TOUCH HANDLERS ────────────────────────────────
function setupButtons() {
  const buttonsList = [
    { id: 'btn-hit', key: 'HIT' },
    { id: 'btn-lob', key: 'LOB' },
    { id: 'btn-power', key: 'POWER' },
    { id: 'btn-dive', key: 'DIVE' }
  ];

  const passiveOpts = { passive: false };

  buttonsList.forEach(({ id, key }) => {
    const el = document.getElementById(id);
    if (!el) return;

    // Touch Support
    el.addEventListener('touchstart', (e) => {
      e.preventDefault();
      el.classList.add('active');
      triggerHaptic(18); // Short vibration hit feel
      sendInput('btnDown', { btn: key });
    }, passiveOpts);

    el.addEventListener('touchend', (e) => {
      e.preventDefault();
      el.classList.remove('active');
      sendInput('btnUp', { btn: key });
    }, passiveOpts);

    el.addEventListener('touchcancel', (e) => {
      e.preventDefault();
      el.classList.remove('active');
      sendInput('btnUp', { btn: key });
    }, passiveOpts);

    // Mouse Support
    el.addEventListener('mousedown', (e) => {
      e.preventDefault();
      el.classList.add('active');
      triggerHaptic(18);
      sendInput('btnDown', { btn: key });
    });

    el.addEventListener('mouseup', (e) => {
      e.preventDefault();
      el.classList.remove('active');
      sendInput('btnUp', { btn: key });
    });

    el.addEventListener('mouseleave', () => {
      if (el.classList.contains('active')) {
        el.classList.remove('active');
        sendInput('btnUp', { btn: key });
      }
    });
  });
}

function sendInput(type, payload) {
  if (!socket || !socket.connected) return;
  
  // Explicitly embed the player slot mapping into the message payload!
  socket.emit('controller-input', { 
    type, 
    slot: playerSlot, 
    ...payload 
  });
}

// Startup
function start() {
  initSocket();
  new VirtualStick('left-stick', 'left-stick-boundary');
  setupButtons();

  if (ui.joinBtn) {
    ui.joinBtn.onclick = () => {
      if (ui.roomInput) {
        const val = ui.roomInput.value.toUpperCase().trim();
        joinRoom(val, playerSlot);
      }
      enterFullscreen();
    };
  }

  window.addEventListener('click', () => {
    if (socket && socket.connected) {
      enterFullscreen();
    }
  });
  window.addEventListener('touchstart', () => {
    if (socket && socket.connected) {
      enterFullscreen();
    }
  });
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  start();
} else {
  document.addEventListener('DOMContentLoaded', start);
}
