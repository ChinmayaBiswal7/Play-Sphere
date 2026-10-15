// PlaySphere Virtual DualSense Controller Script
let socket = null;
let roomCode = '';
let currentLayout = 'racing'; // Default to racing for F1

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

// ── 1. DUALSENSE ACOUSTIC & PHYSICAL HAPTICS ──────────────────────────
let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) audioCtx = new AudioContextClass();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// Crisp mechanical controller click sound (plays on all mobile devices including iOS)
function playControllerClickSound(freq = 140, duration = 0.025, vol = 0.14) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + duration);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {}
}

// Full controller vibration with hardware rumble + acoustic transient
function triggerControllerVibe(pattern = 20) {
  // 1. Hardware vibration (Android / Chrome / Firefox)
  if (navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {}
  }
  // 2. Synthetic haptic click
  playControllerClickSound(160, 0.025, 0.12);
}

// Legacy alias
function triggerHaptic(duration = 20) {
  triggerControllerVibe(duration);
}

// ── 2. FULLSCREEN HELPER ──────────────────────────────────────────────
function enterFullscreen() {
  try {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      const docEl = document.documentElement;
      const req = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.mozRequestFullScreen || docEl.msRequestFullscreen;
      if (req) {
        req.call(docEl).catch(() => {});
      }
    }
  } catch (e) {}
}

// ── 3. URL PARAMETER PARSER ───────────────────────────────────────────
function getUrlParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

// ── 4. WEBSOCKET CONNECTION & AUTO-SYNC ──────────────────────────────
function initSocket() {
  socket = io();

  socket.on('connect', () => {
    console.log('[Controller] Connected to server socket');
    
    // 1. Always prioritize active room parameter in URL from scanned QR code!
    const urlRoom = getUrlParam('room') || getUrlParam('roomCode');
    if (urlRoom && urlRoom.length >= 4) {
      const code = urlRoom.toUpperCase().trim();
      if (ui.roomInput) ui.roomInput.value = code;
      joinRoom(code);
    } else {
      // 2. Fall back to previous active session if no URL room provided
      const storedRoom = sessionStorage.getItem('activeRoomCode');
      if (storedRoom) {
        console.log(`[Controller] Attempting rejoin to room: ${storedRoom}`);
        socket.emit('rejoin-room-phone', { roomCode: storedRoom });
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
    sessionStorage.removeItem('activeRoomCode');
    
    // If rejoin failed but URL parameter exists, try connecting to the URL room directly!
    const urlRoom = getUrlParam('room') || getUrlParam('roomCode');
    if (urlRoom && urlRoom.toUpperCase().trim() !== roomCode) {
      console.log(`[Controller] Rejoin failed, attempting fallback to URL room: ${urlRoom}`);
      joinRoom(urlRoom.toUpperCase().trim());
      return;
    }

    if (ui.roomError) ui.roomError.innerText = msg;
    triggerControllerVibe([60, 40, 60]);
    if (ui.loader) {
      ui.loader.classList.remove('hidden');
      ui.loader.style.display = 'flex';
    }
  });

  socket.on('layout-change', ({ layout }) => {
    if (layout) updateLayout(layout);
  });

  // Game telemetry rumble relay from PC (engine revs, kerbs, shifts, crashes)
  socket.on('trigger-vibration', (data) => {
    const pattern = (data && data.pattern) ? data.pattern : 60;
    triggerControllerVibe(pattern);
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

  socket.on('reconnect', () => {
    if (roomCode) {
      socket.emit('rejoin-room-phone', { roomCode });
    }
  });
}

function joinRoom(code) {
  if (!code || code.length < 4) {
    if (ui.roomError) ui.roomError.innerText = 'Enter 4-character room code.';
    return;
  }
  if (ui.roomError) ui.roomError.innerText = '';
  socket.emit('join-room-phone', { roomCode: code.toUpperCase().trim() });
}

function onJoinSuccess(code, initialLayout) {
  roomCode = code;
  sessionStorage.setItem('activeRoomCode', code);
  
  if (ui.roomDisplay) ui.roomDisplay.innerText = `ROOM: ${code}`;
  
  // Completely hide and remove loader overlay so it cannot intercept gestures
  if (ui.loader) {
    ui.loader.classList.add('hidden');
    ui.loader.style.display = 'none';
  }
  if (ui.roomInput) ui.roomInput.blur();

  updateStatus('CONNECTED', '#10b981');
  
  // Set F1 Racing layout by default
  updateLayout(initialLayout || 'racing');
  
  // Play authentic DualSense connection pulse
  triggerControllerVibe([80, 50, 100]);
  enterFullscreen();
}

function updateStatus(text, colorHex) {
  if (ui.statusText) ui.statusText.innerText = text;
  if (ui.statusInd) {
    ui.statusInd.style.backgroundColor = colorHex;
    ui.statusInd.style.boxShadow = `0 0 12px ${colorHex}`;
  }
}

// ── 5. DYNAMIC ROLE & CONTROL LABELS ──────────────────────────────────
function updateLayout(layout) {
  currentLayout = layout;

  const btnR2 = document.getElementById('btn-r2');
  const btnL2 = document.getElementById('btn-l2');
  const btnR1 = document.getElementById('btn-r1');
  const btnL1 = document.getElementById('btn-l1');
  const roleText = ui.roleText;

  if (layout === 'racing' || layout === 'f1') {
    if (roleText) {
      roleText.innerText = 'F1 RACING CONTROLLER';
      roleText.style.color = '#ef4444';
    }
    if (btnR2) btnR2.innerHTML = 'R2<span class="sub-label">GAS</span>';
    if (btnL2) btnL2.innerHTML = 'L2<span class="sub-label">BRAKE</span>';
    if (btnR1) btnR1.innerHTML = 'R1<span class="sub-label">GEAR+</span>';
    if (btnL1) btnL1.innerHTML = 'L1<span class="sub-label">GEAR-</span>';
    
    // Set DualSense Lightbar color to Electric Red / Cyan
    const lightbars = document.querySelectorAll('.ps5-lightbar');
    lightbars.forEach(lb => {
      lb.style.background = '#ef4444';
      lb.style.boxShadow = '0 0 14px #ef4444';
    });
  } else {
    if (roleText) {
      roleText.innerText = 'PLAYSPHERE DUALSENSE';
      roleText.style.color = '#60a5fa';
    }
    if (btnR2) btnR2.innerHTML = 'R2';
    if (btnL2) btnL2.innerHTML = 'L2';
    if (btnR1) btnR1.innerHTML = 'R1';
    if (btnL1) btnL1.innerHTML = 'L1';

    const lightbars = document.querySelectorAll('.ps5-lightbar');
    lightbars.forEach(lb => {
      lb.style.background = '#38bdf8';
      lb.style.boxShadow = '0 0 14px #38bdf8';
    });
  }
}

// ── 6. ULTRA-RESPONSIVE DUALSENSE VIRTUAL STICK ─────────────────────────
class VirtualStick {
  constructor(knobId, boundaryId, zoneSelector, type) {
    this.knob = document.getElementById(knobId);
    this.boundary = document.getElementById(boundaryId);
    this.zone = document.querySelector(zoneSelector) || this.boundary;
    this.type = type; // 'left' or 'right'
    this.activeTouchId = null;
    this.isMouseDown = false;
    this.center = { x: 0, y: 0 };
    this.maxRadius = 45; // comfortable physical travel distance

    if (this.knob && this.boundary) {
      this.init();
    }
  }

  updateCenter() {
    const rect = this.boundary.getBoundingClientRect();
    this.center.x = rect.left + rect.width / 2;
    this.center.y = rect.top + rect.height / 2;
  }

  init() {
    const passiveOpts = { passive: false };

    const startTouch = (clientX, clientY, identifier) => {
      this.activeTouchId = identifier;
      this.updateCenter();
      this.knob.classList.add('active');
      this.knob.style.transition = 'none'; // Instant 60fps tracking without CSS delay
      this.updatePosition(clientX, clientY);
      triggerControllerVibe(16);
    };

    // Touch start on boundary OR zone OR knob
    const touchStartHandler = (e) => {
      if (this.activeTouchId !== null) return;
      if (!e.changedTouches || e.changedTouches.length === 0) return;
      e.preventDefault();
      const touch = e.changedTouches[0];
      startTouch(touch.clientX, touch.clientY, touch.identifier);
    };

    this.boundary.addEventListener('touchstart', touchStartHandler, passiveOpts);
    if (this.zone && this.zone !== this.boundary) {
      this.zone.addEventListener('touchstart', touchStartHandler, passiveOpts);
    }
    if (this.knob) {
      this.knob.addEventListener('touchstart', touchStartHandler, passiveOpts);
    }

    // Global touchmove on window: tracks user thumb anywhere on the screen!
    window.addEventListener('touchmove', (e) => {
      if (this.activeTouchId === null) return;
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === this.activeTouchId) {
          e.preventDefault();
          this.updatePosition(e.touches[i].clientX, e.touches[i].clientY);
          break;
        }
      }
    }, passiveOpts);

    // Global touchend / touchcancel on window: never leaves stick stuck at angle!
    const touchEndHandler = (e) => {
      if (this.activeTouchId === null) return;
      if (e.changedTouches) {
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === this.activeTouchId) {
            e.preventDefault();
            this.reset();
            break;
          }
        }
      }
    };
    window.addEventListener('touchend', touchEndHandler, passiveOpts);
    window.addEventListener('touchcancel', touchEndHandler, passiveOpts);

    // Mouse fallback for browser testing
    this.boundary.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.isMouseDown = true;
      startTouch(e.clientX, e.clientY, 'mouse');
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
      const isBowling = (currentLayout === 'bowling');
      const finalX = isBowling ? -normalizedX : normalizedX;
      sendInput('joystick', { x: finalX, y: normalizedY });
    } else {
      sendInput('aim-joystick', { x: normalizedX, y: normalizedY });
    }
  }

  reset() {
    this.activeTouchId = null;
    this.knob.classList.remove('active');
    // Smooth physical spring snap back to center
    this.knob.style.transition = 'transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    this.knob.style.transform = 'translate(0px, 0px)';
    if (this.type === 'left') {
      sendInput('joystick', { x: 0, y: 0 });
    } else {
      sendInput('aim-joystick', { x: 0, y: 0 });
    }
  }
}

// ── 7. DUALSENSE BUTTON TOUCH HANDLERS ─────────────────────────────────
function setupButtons() {
  const buttonsList = [
    { id: 'btn-triangle', key: 'triangle', rumble: [24] },
    { id: 'btn-circle', key: 'circle', rumble: [20] },
    { id: 'btn-cross', key: 'cross', rumble: [20] },
    { id: 'btn-square', key: 'square', rumble: [20] },
    { id: 'btn-l1', key: 'l1', rumble: [25] },
    { id: 'btn-r1', key: 'r1', rumble: [25] },
    { id: 'btn-l2', key: 'l2', rumble: [35, 15, 30] },
    { id: 'btn-r2', key: 'r2', rumble: [35, 15, 30] },
    { id: 'btn-create', key: 'create', rumble: [15] },
    { id: 'btn-options', key: 'options', rumble: [15] },
    { id: 'btn-dpad-up', key: 'dpadUp', rumble: [18] },
    { id: 'btn-dpad-down', key: 'dpadDown', rumble: [18] },
    { id: 'btn-dpad-left', key: 'dpadLeft', rumble: [18] },
    { id: 'btn-dpad-right', key: 'dpadRight', rumble: [18] },
    { id: 'btn-ps', key: 'ps', rumble: [50, 30, 50] }
  ];

  const passiveOpts = { passive: false };

  buttonsList.forEach(({ id, key, rumble }) => {
    const el = document.getElementById(id);
    if (!el) return;

    let touchIdentifier = null;

    el.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (e.changedTouches && e.changedTouches.length > 0) {
        touchIdentifier = e.changedTouches[0].identifier;
      }
      el.classList.add('active');
      triggerControllerVibe(rumble || 20);
      sendInput('btnDown', { btn: key });
    }, passiveOpts);

    const onRelease = (e) => {
      if (touchIdentifier !== null && e.changedTouches) {
        let matched = false;
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === touchIdentifier) {
            matched = true;
            break;
          }
        }
        if (!matched) return;
      }
      touchIdentifier = null;
      el.classList.remove('active');
      sendInput('btnUp', { btn: key });
    };

    el.addEventListener('touchend', onRelease, passiveOpts);
    el.addEventListener('touchcancel', onRelease, passiveOpts);
    window.addEventListener('touchend', onRelease, passiveOpts);
    window.addEventListener('touchcancel', onRelease, passiveOpts);

    // Mouse Support
    el.addEventListener('mousedown', (e) => {
      e.preventDefault();
      el.classList.add('active');
      triggerControllerVibe(rumble || 20);
      sendInput('btnDown', { btn: key });
    });

    const onMouseUp = () => {
      if (el.classList.contains('active')) {
        el.classList.remove('active');
        sendInput('btnUp', { btn: key });
      }
    };
    el.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mouseup', onMouseUp);

    el.addEventListener('mouseleave', () => {
      if (el.classList.contains('active')) {
        el.classList.remove('active');
        sendInput('btnUp', { btn: key });
      }
    });
  });
}

// ── 8. DUALSENSE TOUCHPAD AS MOUSE TRACKPAD ────────────────────────────
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
    triggerControllerVibe(14);
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
      triggerControllerVibe([25, 20]);
      sendInput('touchpad-click', {});
      sendInput('btnDown', { btn: 'touchpad' });
      setTimeout(() => sendInput('btnUp', { btn: 'touchpad' }), 100);
    }

    lastTouchX = null;
    lastTouchY = null;
  };

  tp.addEventListener('touchend', endHandler, { passive: false });
  tp.addEventListener('touchcancel', endHandler, { passive: false });
}

function sendInput(type, payload) {
  if (!socket || !socket.connected) return;
  if (!payload || typeof payload !== 'object') return;
  if (typeof type !== 'string') return;
  socket.emit('controller-input', { type, ...payload });
}

// ── 9. STARTUP LIFECYCLE ──────────────────────────────────────────────
let started = false;

function start() {
  if (started) return;
  started = true;

  initSocket();
  new VirtualStick('left-stick', 'left-stick-boundary', '.joystick-zone-left', 'left');
  new VirtualStick('right-stick', 'right-stick-boundary', '.joystick-zone-right', 'right');
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

  // Auto-fullscreen trigger on first user gesture
  window.addEventListener('click', enterFullscreen, { once: true });
  window.addEventListener('touchstart', enterFullscreen, { once: true });

  if (ui.roomInput) {
    ui.roomInput.focus();
  }
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  start();
} else {
  document.addEventListener('DOMContentLoaded', start);
}
