// PlaySphere Virtual DualSense Controller Script
let socket = null;
let roomCode = '';
let currentLayout = 'dashboard'; // 'dashboard', 'bowling', 'batting'

const ui = {
  loader: document.getElementById('loader-screen'),
  roomInput: document.getElementById('room-input'),
  joinBtn: document.getElementById('join-btn'),
  roomError: document.getElementById('room-error'),
  statusInd: document.getElementById('status-ind'),
  statusText: document.getElementById('status-text'),
  roomDisplay: document.getElementById('room-display-code'),
  roleText: document.getElementById('role-text')
};

// ── VIBRATION HAPTICS ──────────────────────────────────────────
function triggerHaptic(duration = 20) {
  if (navigator.vibrate) {
    try {
      navigator.vibrate(duration);
    } catch (e) {
      console.warn("Haptic vibrate blocked/failed:", e);
    }
  }
}

// ── REQUEST FULLSCREEN ─────────────────────────────────────────
function enterFullscreen() {
  try {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      const req = document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen;
      if (req) {
        req.call(document.documentElement).catch((err) => {
          console.warn("Fullscreen request rejected:", err);
        });
      }
    }
  } catch (e) {}
}

// ── GET ROOM CODE FROM URL ──────────────────────────────────────
function getUrlParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

// ── SOCKET INITIALIZATION & RECONNECT ──────────────────────────
function initSocket() {
  socket = io();

  socket.on('connect', () => {
    console.log('Controller connected to WebSocket server');
    
    const storedRoom = sessionStorage.getItem('activeRoomCode');
    if (storedRoom) {
      console.log(`Rejoining Room: ${storedRoom}`);
      socket.emit('rejoin-room-phone', { roomCode: storedRoom });
    } else {
      const urlRoom = getUrlParam('room');
      if (urlRoom) {
        ui.roomInput.value = urlRoom;
        joinRoom(urlRoom);
      }
    }
  });

  socket.on('phone-joined', ({ roomCode: code, layout }) => {
    onJoinSuccess(code, layout);
  });

  socket.on('phone-rejoined', ({ roomCode: code, layout }) => {
    onJoinSuccess(code, layout);
  });

  socket.on('room-error', (msg) => {
    if (ui.roomError) ui.roomError.innerText = msg;
    triggerHaptic([50, 50]);
    sessionStorage.removeItem('activeRoomCode');
  });

  socket.on('layout-change', ({ layout }) => {
    if (layout) updateLayout(layout);
  });

  socket.on('trigger-vibration', (data) => {
    const pattern = (data && data.pattern) ? data.pattern : 200;
    triggerHaptic(pattern);
  });

  socket.on('pc-disconnected', () => {
    updateStatus('DISCONNECTED (PC Left)', '#ef4444');
    sessionStorage.removeItem('activeRoomCode');
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  });

  socket.on('disconnect', () => {
    updateStatus('RECONNECTING...', '#eab308');
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log(`Controller reconnected after ${attemptNumber} attempts`);
    if (roomCode) {
      socket.emit('rejoin-room-phone', { roomCode });
    }
  });

  socket.on('reconnect_error', (error) => {
    console.warn('Reconnect error:', error);
    updateStatus('RECONNECTING...', '#eab308');
  });
}

function joinRoom(code) {
  if (!code || code.length < 4) {
    if (ui.roomError) ui.roomError.innerText = 'Please enter a valid 4-character code.';
    return;
  }
  if (ui.roomError) ui.roomError.innerText = '';
  socket.emit('join-room-phone', { roomCode: code });
}

function onJoinSuccess(code, initialLayout) {
  roomCode = code;
  sessionStorage.setItem('activeRoomCode', code);
  
  if (ui.roomDisplay) ui.roomDisplay.innerText = `ROOM: ${code}`;
  if (ui.loader) ui.loader.classList.add('hidden');
  updateStatus('CONNECTED', '#10b981');
  
  if (initialLayout) {
    updateLayout(initialLayout);
  } else {
    updateLayout('dashboard');
  }
  
  triggerHaptic([60, 40, 60]); // Boot rumble feel
  enterFullscreen();
}

function updateStatus(text, colorHex) {
  if (ui.statusText) ui.statusText.innerText = text;
  if (ui.statusInd) {
    ui.statusInd.style.backgroundColor = colorHex;
    ui.statusInd.style.boxShadow = `0 0 10px ${colorHex}`;
  }
}

// ── DYNAMIC ROLE LAYOUT SWITCHER ───────────────────────────────
function updateLayout(layout) {
  if (currentLayout === layout) return;
  currentLayout = layout;
  triggerHaptic([30, 15, 30]); // Switch layout vibration pulse

  if (!ui.roleText) return;

  if (layout === 'bowling') {
    ui.roleText.innerText = 'BOWLING MODE';
    ui.roleText.style.color = '#facc15';
  } else if (layout === 'batting') {
    ui.roleText.innerText = 'BATTING MODE';
    ui.roleText.style.color = '#10b981';
  } else {
    ui.roleText.innerText = 'DASHBOARD CONTROLLER';
    ui.roleText.style.color = '#60a5fa';
  }
}

// ── VIRTUAL STICK CLASS ─────────────────────────────────────────
class VirtualStick {
  constructor(knobId, boundaryId, type) {
    this.knob = document.getElementById(knobId);
    this.boundary = document.getElementById(boundaryId);
    this.type = type; // 'left' or 'right'
    this.activeTouchId = null;
    this.isMouseDown = false;
    this.center = { x: 0, y: 0 };
    this.maxRadius = 38; // matching smaller size in layout

    if (this.knob && this.boundary) {
      this.init();
    }
  }

  init() {
    const passiveOpts = { passive: false };

    // Touch handlers
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

    // Mouse handlers
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

    if (this.type === 'left') {
      // Invert X ONLY in bowling mode (since camera faces the opposite direction of the pitch)
      const isBowling = (currentLayout === 'bowling');
      const finalX = isBowling ? -normalizedX : normalizedX;
      sendInput('joystick', { x: finalX, y: normalizedY });
    } else {
      sendInput('aim-joystick', { x: normalizedX, y: normalizedY });
    }
  }

  reset() {
    this.activeTouchId = null;
    this.knob.style.transform = 'translate(0px, 0px)';
    if (this.type === 'left') {
      sendInput('joystick', { x: 0, y: 0 });
    } else {
      sendInput('aim-joystick', { x: 0, y: 0 });
    }
  }
}

// ── PS5 BUTTON TOUCH HANDLERS ──────────────────────────────────
function setupButtons() {
  const buttonsList = [
    { id: 'btn-triangle', key: 'triangle' },
    { id: 'btn-circle', key: 'circle' },
    { id: 'btn-cross', key: 'cross' },
    { id: 'btn-square', key: 'square' },
    { id: 'btn-l1', key: 'l1' },
    { id: 'btn-r1', key: 'r1' },
    { id: 'btn-l2', key: 'l2' },
    { id: 'btn-r2', key: 'r2' },
    { id: 'btn-create', key: 'create' },
    { id: 'btn-options', key: 'options' },
    { id: 'btn-dpad-up', key: 'dpadUp' },
    { id: 'btn-dpad-down', key: 'dpadDown' },
    { id: 'btn-dpad-left', key: 'dpadLeft' },
    { id: 'btn-dpad-right', key: 'dpadRight' },
    { id: 'btn-ps', key: 'ps' }
  ];

  const passiveOpts = { passive: false };

  buttonsList.forEach(({ id, key }) => {
    const el = document.getElementById(id);
    if (!el) return;

    // Touch Support
    el.addEventListener('touchstart', (e) => {
      e.preventDefault();
      el.classList.add('active');
      triggerHaptic(18); // short tap feel
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

// ── TOUCHPAD AS MOUSE TRACKPAD ──────────────────────────────────
function setupTouchpadTrackpad() {
  const tp = document.getElementById('btn-touchpad');
  if (!tp) return;

  let lastTouchX = null;
  let lastTouchY = null;
  let touchStartTime = 0;
  let totalDist = 0;

  tp.addEventListener('touchstart', (e) => {
    e.preventDefault();
    tp.classList.add('active');
    triggerHaptic(10);
    const touch = e.touches[0];
    lastTouchX = touch.clientX;
    lastTouchY = touch.clientY;
    touchStartTime = Date.now();
    totalDist = 0;
  }, { passive: false });

  tp.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (lastTouchX === null || lastTouchY === null) return;
    const touch = e.touches[0];
    const dx = touch.clientX - lastTouchX;
    const dy = touch.clientY - lastTouchY;
    
    totalDist += Math.sqrt(dx * dx + dy * dy);

    // Emit drag move delta coordinates to PC client
    sendInput('touchpad-move', { dx: dx, dy: dy });

    lastTouchX = touch.clientX;
    lastTouchY = touch.clientY;
  }, { passive: false });

  const endHandler = (e) => {
    e.preventDefault();
    tp.classList.remove('active');
    
    // Tap detection: short duration + small movement
    const duration = Date.now() - touchStartTime;
    if (duration < 250 && totalDist < 8) {
      triggerHaptic(24);
      sendInput('touchpad-click', {});
    }

    lastTouchX = null;
    lastTouchY = null;
  };

  tp.addEventListener('touchend', endHandler, { passive: false });
  tp.addEventListener('touchcancel', endHandler, { passive: false });

  // Mouse fallback support for emulator / testing
  let isMouseDown = false;
  tp.addEventListener('mousedown', (e) => {
    e.preventDefault();
    tp.classList.add('active');
    triggerHaptic(10);
    isMouseDown = true;
    lastTouchX = e.clientX;
    lastTouchY = e.clientY;
    touchStartTime = Date.now();
    totalDist = 0;
  });

  window.addEventListener('mousemove', (e) => {
    if (!isMouseDown) return;
    const dx = e.clientX - lastTouchX;
    const dy = e.clientY - lastTouchY;
    totalDist += Math.sqrt(dx * dx + dy * dy);
    
    sendInput('touchpad-move', { dx: dx, dy: dy });
    
    lastTouchX = e.clientX;
    lastTouchY = e.clientY;
  });

  window.addEventListener('mouseup', () => {
    if (isMouseDown) {
      isMouseDown = false;
      tp.classList.remove('active');
      const duration = Date.now() - touchStartTime;
      if (duration < 250 && totalDist < 8) {
        triggerHaptic(24);
        sendInput('touchpad-click', {});
      }
    }
  });
}

function sendInput(type, payload) {
  if (!socket || !socket.connected) return;
  if (!payload || typeof payload !== 'object') return;
  if (typeof type !== 'string') return;
  socket.emit('controller-input', { type, ...payload });
}

// ── STARTUP ────────────────────────────────────────────────────
let started = false;

function start() {
  if (started) return;
  started = true;

  initSocket();
  new VirtualStick('left-stick', 'left-stick-boundary', 'left');
  new VirtualStick('right-stick', 'right-stick-boundary', 'right');
  setupButtons();
  setupTouchpadTrackpad();

  if (ui.joinBtn) {
    ui.joinBtn.onclick = () => {
      if (ui.roomInput) {
        const val = ui.roomInput.value.toUpperCase().trim();
        joinRoom(val);
      }
      enterFullscreen();
    };
  }

  // Connect click events anywhere to fullscreen triggers once paired
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

  if (ui.roomInput) {
    ui.roomInput.focus();
  }
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  start();
} else {
  document.addEventListener('DOMContentLoaded', start);
}
