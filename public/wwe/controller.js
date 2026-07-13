let socket = null;
let roomCode = '';
let playerSlot = null; // 'PLAYER_1' or 'PLAYER_2'
let phoneSlotNum = 1;

const ui = {
  loader: document.getElementById('loader-screen'),
  roomInput: document.getElementById('room-input'),
  joinBtn: document.getElementById('join-btn'),
  roomError: document.getElementById('room-error'),
  statusInd: document.getElementById('status-ind'),
  statusText: document.getElementById('status-text'),
  roomDisplay: document.getElementById('room-display-code'),
  playerIndicator: document.getElementById('player-indicator'),
  controllerScreen: document.getElementById('controller-screen'),
  
  // Pin overlays
  pinOverlay: document.getElementById('pin-overlay'),
  kickoutTargetZone: document.getElementById('kickout-target-zone'),
  kickoutNeedle: document.getElementById('kickout-needle'),
  kickoutActionBtn: document.getElementById('btn-kickout')
};

// ── VIBRATION HAPTICS ──────────────────────────────────────────
function triggerHaptic(duration = 20) {
  if (navigator.vibrate) {
    try {
      navigator.vibrate(duration);
    } catch (e) {}
  }
}

// Request fullscreen on pairing
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

function getUrlParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

// ── SOCKET PROTOCOLS ───────────────────────────────────────────
function initSocket() {
  socket = io();

  socket.on('connect', () => {
    console.log('WWE Controller paired to server');
    
    const storedRoom = sessionStorage.getItem('wweActiveRoomCode');
    const storedSlot = sessionStorage.getItem('wweActivePlayerSlot');
    
    const urlRoom = getUrlParam('room');
    const urlSlot = getUrlParam('slot');

    if (urlRoom) {
      roomCode = urlRoom.toUpperCase().trim();
      playerSlot = urlSlot || playerSlot;
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
    sessionStorage.removeItem('wweActiveRoomCode');
  });

  socket.on('trigger-vibration', (data) => {
    if (data && data.slot && data.slot !== playerSlot) return; // slot filtering
    const pattern = (data && data.pattern) ? data.pattern : 200;
    triggerHaptic(pattern);
  });

  // Enable/Disable Finisher button
  socket.on('finisher-status', (data) => {
    if (data && data.slot && data.slot !== playerSlot) return;
    const btn = document.getElementById('btn-finisher');
    if (btn) {
      if (data.ready) {
        btn.classList.remove('disabled');
      } else {
        btn.classList.add('disabled');
      }
    }
  });

  // Pin struggle overlay triggers
  socket.on('start-pinfall', (data) => {
    if (data && data.slot && data.slot !== playerSlot) return;
    startPinfallIndicator(data.targetLeft, data.targetWidth);
  });

  socket.on('end-pinfall', (data) => {
    if (data && data.slot && data.slot !== playerSlot) return;
    stopPinfallIndicator();
  });

  socket.on('pc-disconnected', () => {
    updateStatus('PC DISCONNECTED', '#ef4444');
    sessionStorage.removeItem('wweActiveRoomCode');
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  });

  socket.on('disconnect', () => {
    updateStatus('RECONNECTING...', '#eab308');
  });

  socket.on('reconnect', () => {
    if (roomCode) {
      socket.emit('join-room-phone', { roomCode, slot: playerSlot });
    }
  });
}

function joinRoom(code, slot) {
  if (!code || code.length < 4) {
    if (ui.roomError) ui.roomError.innerText = 'Enter a valid 4-character code.';
    return;
  }
  socket.emit('join-room-phone', { roomCode: code, slot: slot });
}

function onJoinSuccess(code, slotNum) {
  roomCode = code;
  phoneSlotNum = slotNum;
  sessionStorage.setItem('wweActiveRoomCode', code);
  
  if (!playerSlot) {
    playerSlot = slotNum === 1 ? 'PLAYER_1' : 'PLAYER_2';
  }
  sessionStorage.setItem('wweActivePlayerSlot', playerSlot);

  if (ui.roomDisplay) ui.roomDisplay.innerText = `ROOM: ${code}`;
  if (ui.loader) ui.loader.classList.add('hidden');
  updateStatus('CONNECTED', '#10b981');
  
  const isP1 = (playerSlot === 'PLAYER_1');
  if (ui.playerIndicator) {
    ui.playerIndicator.innerText = isP1 ? 'PLAYER 1' : 'PLAYER 2';
    ui.playerIndicator.className = isP1 ? 'player-indicator p1-theme' : 'player-indicator p2-theme';
  }
  
  const stickBase = document.getElementById('left-stick-boundary');
  if (stickBase) {
    stickBase.className = isP1 ? 'thumbstick-base p1-stick-theme' : 'thumbstick-base p2-stick-theme';
  }

  triggerHaptic([60, 40, 60]);
  enterFullscreen();
}

function updateStatus(text, colorHex) {
  if (ui.statusText) ui.statusText.innerText = text;
  if (ui.statusInd) {
    ui.statusInd.style.backgroundColor = colorHex;
    ui.statusInd.style.boxShadow = `0 0 10px ${colorHex}`;
  }
}

// ── PINFALL NEEDLE GAUGE RENDER LOOP ────────────────────────────
let isPinfallActive = false;
let pinNeedlePos = 0;
let pinNeedleDir = 1;
let pinAnimFrame = null;

function startPinfallIndicator(targetLeft, targetWidth) {
  isPinfallActive = true;
  ui.pinOverlay.classList.remove('hidden');
  
  // Position green target zone (in percentages)
  ui.kickoutTargetZone.style.left = `${targetLeft}%`;
  ui.kickoutTargetZone.style.width = `${targetWidth}%`;
  
  pinNeedlePos = 0;
  pinNeedleDir = 1;
  
  triggerHaptic([100, 50, 100]); // vibrate alert
  
  function updateNeedle() {
    if (!isPinfallActive) return;
    
    // needle oscillates left to right (speed scales up at lower health)
    pinNeedlePos += 2.25 * pinNeedleDir;
    if (pinNeedlePos >= 100) {
      pinNeedlePos = 100;
      pinNeedleDir = -1;
    } else if (pinNeedlePos <= 0) {
      pinNeedlePos = 0;
      pinNeedleDir = 1;
    }
    
    ui.kickoutNeedle.style.left = `${pinNeedlePos}%`;
    pinAnimFrame = requestAnimationFrame(updateNeedle);
  }
  
  pinAnimFrame = requestAnimationFrame(updateNeedle);
}

function stopPinfallIndicator() {
  isPinfallActive = false;
  if (pinAnimFrame) cancelAnimationFrame(pinAnimFrame);
  ui.pinOverlay.classList.add('hidden');
}

// Bind kick-out action tap
ui.kickoutActionBtn.onclick = () => {
  if (!isPinfallActive) return;
  triggerHaptic(18);
  
  // Send kickout position attempt to PC client
  socket.emit('controller-input', {
    type: 'kickout-attempt',
    slot: playerSlot,
    position: pinNeedlePos
  });
};

// ── VIRTUAL THUMBSTICK JOYSTICK ────────────────────────────────
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

    // Mouse Fallbacks
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

// ── BUTTON CLICK HANDLERS ──────────────────────────────────────
function setupButtons() {
  const buttonsList = [
    { id: 'btn-strike', key: 'STRIKE' },
    { id: 'btn-grapple', key: 'GRAPPLE' },
    { id: 'btn-block', key: 'BLOCK' },
    { id: 'btn-finisher', key: 'FINISHER' }
  ];

  const passiveOpts = { passive: false };

  buttonsList.forEach(({ id, key }) => {
    const el = document.getElementById(id);
    if (!el) return;

    el.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (el.classList.contains('disabled')) return;
      
      el.classList.add('active');
      triggerHaptic(16);
      sendInput('btnDown', { btn: key });
    }, passiveOpts);

    el.addEventListener('touchend', (e) => {
      e.preventDefault();
      if (el.classList.contains('disabled')) return;
      
      el.classList.remove('active');
      sendInput('btnUp', { btn: key });
    }, passiveOpts);

    // Mouse Fallbacks
    el.addEventListener('mousedown', (e) => {
      e.preventDefault();
      if (el.classList.contains('disabled')) return;
      
      el.classList.add('active');
      triggerHaptic(16);
      sendInput('btnDown', { btn: key });
    });

    el.addEventListener('mouseup', (e) => {
      e.preventDefault();
      if (el.classList.contains('disabled')) return;
      
      el.classList.remove('active');
      sendInput('btnUp', { btn: key });
    });
  });
}

function sendInput(type, payload) {
  if (!socket || !socket.connected) return;
  socket.emit('controller-input', {
    type,
    slot: playerSlot,
    ...payload
  });
}

function start() {
  initSocket();
  new VirtualStick('left-stick', 'left-stick-boundary');
  setupButtons();

  if (ui.joinBtn) {
    ui.joinBtn.onclick = () => {
      if (ui.roomInput) {
        joinRoom(ui.roomInput.value.toUpperCase().trim(), playerSlot);
      }
      enterFullscreen();
    };
  }

  window.addEventListener('click', enterFullscreen);
  window.addEventListener('touchstart', enterFullscreen);
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  start();
} else {
  document.addEventListener('DOMContentLoaded', start);
}
