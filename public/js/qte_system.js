// ── QUICK-TIME EVENT (QTE) FIELDING & CATCHING SYSTEM ───────────────────

(function() {
  // Inject CSS Styles for QTE overlays
  if (!document.getElementById('qte-system-styles')) {
    const style = document.createElement('style');
    style.id = 'qte-system-styles';
    style.innerHTML = `
      /* Circular Catching QTE HUD Overlay */
      #qte-catch-container {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0.85);
        width: 250px;
        height: 250px;
        background: rgba(15, 23, 42, 0.7);
        border: 2px solid rgba(255, 255, 255, 0.15);
        border-radius: 50%;
        box-shadow: 0 0 50px rgba(0,0,0,0.6);
        backdrop-filter: blur(8px);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 100000;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }
      #qte-catch-container.visible {
        opacity: 1;
        pointer-events: auto;
        transform: translate(-50%, -50%) scale(1);
      }
      
      .qte-dial-svg {
        width: 180px;
        height: 180px;
        transform: rotate(-90deg); /* 12 o'clock start */
      }
      
      .qte-dial-bg {
        fill: none;
        stroke: rgba(239, 68, 68, 0.8); /* Fail Red */
        stroke-width: 18;
      }
      .qte-dial-target {
        fill: none;
        stroke: rgba(34, 197, 94, 0.95); /* Success Green */
        stroke-width: 20;
        stroke-dasharray: 25 100; /* success slice size */
        stroke-dashoffset: 0;
        filter: drop-shadow(0 0 6px rgba(34,197,94,0.6));
      }
      .qte-dial-needle {
        stroke: #facc15; /* Needle Yellow */
        stroke-width: 4;
        stroke-linecap: round;
      }
      
      .qte-catch-label {
        position: absolute;
        bottom: 22px;
        font-family: 'Outfit', 'Inter', sans-serif;
        font-size: 0.85rem;
        font-weight: 800;
        letter-spacing: 2px;
        color: #facc15;
        text-shadow: 0 0 8px rgba(250,204,21,0.5);
        text-transform: uppercase;
      }
      .qte-catch-icon {
        position: absolute;
        top: 25px;
        font-family: 'Outfit', sans-serif;
        font-size: 0.78rem;
        font-weight: 800;
        letter-spacing: 1px;
        background: rgba(255,255,255,0.1);
        padding: 2px 8px;
        border-radius: 4px;
        color: #fff;
        border: 1px solid rgba(255,255,255,0.15);
      }

      /* Horizontal Throwing QTE HUD Overlay */
      #qte-throw-container {
        position: fixed;
        bottom: 15%;
        left: 50%;
        transform: translateX(-50%) scale(0.85);
        width: 380px;
        background: rgba(15, 23, 42, 0.85);
        border: 1.5px solid rgba(255, 255, 255, 0.12);
        border-bottom: 4px solid #000;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        backdrop-filter: blur(8px);
        padding: 16px 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
        z-index: 100000;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }
      #qte-throw-container.visible {
        opacity: 1;
        pointer-events: auto;
        transform: translateX(-50%) scale(1);
      }

      .qte-throw-bar {
        position: relative;
        width: 100%;
        height: 24px;
        border-radius: 6px;
        overflow: hidden;
        background: #dc2626; /* Default Red (Overthrow) */
        display: flex;
        box-shadow: inset 0 2px 4px rgba(0,0,0,0.4);
      }
      .qte-zone-yellow-left {
        width: 30%;
        background: #eab308; /* Good return */
      }
      .qte-zone-green {
        width: 20%;
        background: #22c55e; /* Direct Hit */
        box-shadow: 0 0 15px rgba(34,197,94,0.6);
      }
      .qte-zone-yellow-right {
        width: 30%;
        background: #eab308;
      }
      
      .qte-throw-slider {
        position: absolute;
        top: 0;
        left: 0%;
        width: 6px;
        height: 100%;
        background: #ffffff;
        box-shadow: 0 0 10px #ffffff, 0 0 20px #ffffff;
        border-radius: 3px;
        transform: translateX(-50%);
      }

      .qte-throw-label {
        font-family: 'Outfit', sans-serif;
        font-size: 0.82rem;
        font-weight: 800;
        letter-spacing: 2px;
        text-transform: uppercase;
        color: #e2e8f0;
        margin-bottom: 10px;
        text-align: center;
      }
      .qte-throw-label span {
        color: #3b82f6;
        text-shadow: 0 0 8px rgba(59,130,246,0.4);
      }
    `;
    document.head.appendChild(style);
  }

  // Inject QTE DOM structure
  if (!document.getElementById('qte-catch-container')) {
    const catchContainer = document.createElement('div');
    catchContainer.id = 'qte-catch-container';
    catchContainer.innerHTML = `
      <div class="qte-catch-icon">SPACE / CROSS</div>
      <svg class="qte-dial-svg" viewBox="0 0 100 100">
        <circle class="qte-dial-bg" cx="50" cy="50" r="40" />
        <circle id="qte-catch-slice" class="qte-dial-target" cx="50" cy="50" r="40" />
        <line id="qte-catch-needle" class="qte-dial-needle" x1="50" y1="50" x2="50" y2="12" />
      </svg>
      <div class="qte-catch-label">TIME THE CATCH</div>
    `;
    document.body.appendChild(catchContainer);
  }

  if (!document.getElementById('qte-throw-container')) {
    const throwContainer = document.createElement('div');
    throwContainer.id = 'qte-throw-container';
    throwContainer.innerHTML = `
      <div class="qte-throw-label">FIELD RETURN: Press <span>SPACE / CROSS</span> to Throw</div>
      <div class="qte-throw-bar">
        <div style="width: 10%;"></div> <!-- Left Red Zone -->
        <div class="qte-zone-yellow-left"></div>
        <div class="qte-zone-green"></div>
        <div class="qte-zone-yellow-right"></div>
        <div style="width: 10%;"></div> <!-- Right Red Zone -->
        <div id="qte-throw-slider" class="qte-throw-slider"></div>
      </div>
    `;
    document.body.appendChild(throwContainer);
  }

  // Global variables
  window.gameTimeScale = 1.0;
  window.qteActive = false;
  window.qteType = ''; // 'catch', 'throw'

  let activeCallback = null;
  let qteTimer = 0;
  let needleAngle = 0; // degrees
  let targetSliceStart = 0; // degrees
  let targetSliceWidth = 45; // degrees

  let sliderPos = 0; // 0 to 100 percent
  let sliderDirection = 1; // 1 = right, -1 = left

  // Listeners for triggers
  window.startCatchQTE = function(callback) {
    if (window.qteActive) return;
    
    console.log('[QTESystem] Starting Catching QTE...');
    window.qteActive = true;
    window.qteType = 'catch';
    activeCallback = callback;
    window.gameTimeScale = 0.2; // Slow-mo active!
    
    // Choose a random angle for the green success wedge (60 to 300 degrees to avoid instant hits)
    targetSliceStart = 60 + Math.random() * 200;
    
    // Adjust slice visually
    const sliceElement = document.getElementById('qte-catch-slice');
    if (sliceElement) {
      // Stroke dasharray represents size of slice. Circumference of circle of r=40 is ~251.3
      const circ = 2 * Math.PI * 40;
      const targetPercent = targetSliceWidth / 360;
      sliceElement.style.strokeDasharray = `${circ * targetPercent} ${circ}`;
      
      // Rotates target slice to the starting angle
      sliceElement.setAttribute('transform', `rotate(${targetSliceStart}, 50, 50)`);
    }

    needleAngle = 0;
    qteTimer = 0;

    const container = document.getElementById('qte-catch-container');
    if (container) container.classList.add('visible');

    // Trigger QTE loop
    animateCatchQTE();
  };

  window.startThrowQTE = function(callback) {
    if (window.qteActive) return;

    console.log('[QTESystem] Starting Throwing QTE...');
    window.qteActive = true;
    window.qteType = 'throw';
    activeCallback = callback;
    window.gameTimeScale = 0.2; // Slow-mo active!

    sliderPos = 0;
    sliderDirection = 1;
    qteTimer = 0;

    const container = document.getElementById('qte-throw-container');
    if (container) container.classList.add('visible');

    // Trigger QTE loop
    animateThrowQTE();
  };

  function animateCatchQTE() {
    if (!window.qteActive || window.qteType !== 'catch') return;

    // Fast rotation (360 degrees per second in real time)
    needleAngle = (needleAngle + 8) % 360;
    
    const needle = document.getElementById('qte-catch-needle');
    if (needle) {
      const rad = (needleAngle * Math.PI) / 180;
      // line coordinates relative to circle center (50, 50)
      const x2 = 50 + Math.cos(rad) * 38;
      const y2 = 50 + Math.sin(rad) * 38;
      needle.setAttribute('x2', x2);
      needle.setAttribute('y2', y2);
    }

    qteTimer += 0.016; // Approx 60fps increment in real time
    if (qteTimer >= 2.0) {
      // Timeout = Automatic drop
      resolveCatchQTE(false);
    } else {
      requestAnimationFrame(animateCatchQTE);
    }
  }

  function animateThrowQTE() {
    if (!window.qteActive || window.qteType !== 'throw') return;

    // Fast slider slide (back and forth)
    sliderPos += sliderDirection * 4;
    if (sliderPos >= 100) {
      sliderPos = 100;
      sliderDirection = -1;
    } else if (sliderPos <= 0) {
      sliderPos = 0;
      sliderDirection = 1;
    }

    const slider = document.getElementById('qte-throw-slider');
    if (slider) {
      slider.style.left = `${sliderPos}%`;
    }

    qteTimer += 0.016;
    if (qteTimer >= 2.0) {
      // Timeout = Bad return / overthrow
      resolveThrowQTE('red');
    } else {
      requestAnimationFrame(animateThrowQTE);
    }
  }

  // Key and Gamepad press listener
  function handleQTETrigger() {
    if (!window.qteActive) return;

    if (window.qteType === 'catch') {
      // Normalise angle to positive 0-360 range
      const currentNeedle = (needleAngle + 360) % 360;
      const targetEnd = (targetSliceStart + targetSliceWidth) % 360;
      
      let isSuccess = false;
      if (targetSliceStart < targetEnd) {
        isSuccess = (currentNeedle >= targetSliceStart && currentNeedle <= targetEnd);
      } else {
        // wraparound
        isSuccess = (currentNeedle >= targetSliceStart || currentNeedle <= targetEnd);
      }
      
      resolveCatchQTE(isSuccess);
    } 
    else if (window.qteType === 'throw') {
      // Bar structure:
      // 0-10: Red
      // 10-40: Yellow (left)
      // 40-60: Green (center)
      // 60-90: Yellow (right)
      // 90-100: Red
      let zone = 'red';
      if (sliderPos >= 40 && sliderPos <= 60) {
        zone = 'green';
      } else if ((sliderPos >= 10 && sliderPos < 40) || (sliderPos > 60 && sliderPos <= 90)) {
        zone = 'yellow';
      }
      
      resolveThrowQTE(zone);
    }
  }

  function resolveCatchQTE(isSuccess) {
    console.log('[QTESystem] Catch QTE Resolved. Success:', isSuccess);
    window.qteActive = false;
    window.gameTimeScale = 1.0; // Restore standard timescale

    const container = document.getElementById('qte-catch-container');
    if (container) container.classList.remove('visible');

    if (activeCallback) activeCallback(isSuccess);
  }

  function resolveThrowQTE(zone) {
    console.log('[QTESystem] Throw QTE Resolved. Zone:', zone);
    window.qteActive = false;
    window.gameTimeScale = 1.0; // Restore standard timescale

    const container = document.getElementById('qte-throw-container');
    if (container) container.classList.remove('visible');

    if (activeCallback) activeCallback(zone);
  }

  // Keyboard Interceptor
  window.addEventListener('keydown', (e) => {
    if (window.qteActive && e.code === 'Space') {
      e.preventDefault();
      handleQTETrigger();
    }
  });

  // Poll controller buttons for QTE trigger backup
  setInterval(() => {
    if (window.qteActive && window.controllerInput) {
      // If Cross or Circle/Square/Triangle is just pressed
      const gp = navigator.getGamepads ? navigator.getGamepads()[window.gamepadIndex] : null;
      if (gp) {
        const pressed = (idx) => gp.buttons[idx] && gp.buttons[idx].pressed;
        const justPressed = (idx) => pressed(idx) && !(window.gamepadPrevButtons[idx] || false);
        if (justPressed(0) || justPressed(1) || justPressed(2) || justPressed(3)) {
          handleQTETrigger();
        }
      }
    }
  }, 16);

})();
