// ── BOWLING HUD ─────────────────────────────────────────────────
// Manages the bowling console HUD widget:
// delivery wheel, length presets, aim preview.

function initBowlingConsoleHud() {
  if (window.bowlingConsoleHudInitialized) return;
  window.bowlingConsoleHudInitialized = true;

  document.querySelectorAll('.wheel-sector').forEach(sec => {
    sec.addEventListener('click', () => {
      if (window.currentBowlingStep !== window.BOWLING_STEPS.SELECT_BALL_TYPE) return;
      window.activeWheelSector = parseInt(sec.getAttribute('data-index'));
      updateWheelVisuals();
    });
  });

  const toggleBtn = document.getElementById('variation-toggle-btn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      if (window.currentBowlingStep !== window.BOWLING_STEPS.SELECT_BALL_TYPE) return;
      toggleBowlingVariations();
    });
  }

  document.querySelectorAll('.length-item').forEach(item => {
    item.addEventListener('click', () => {
      if (window.currentBowlingStep !== window.BOWLING_STEPS.SELECT_LOCATION) return;
      const preset = parseInt(item.getAttribute('data-preset'));
      if (preset === 1) window.MATCH.bowlingTargetZ = 0.5;
      if (preset === 2) window.MATCH.bowlingTargetZ = -1.5;
      if (preset === 3) window.MATCH.bowlingTargetZ = -4.0;
      if (preset === 4) window.MATCH.bowlingTargetZ = -7.0;
      if (window.landingMarker) {
        window.landingMarker.position.set(window.MATCH.bowlingTargetX, 0.052, window.MATCH.bowlingTargetZ);
      }
      updateAimPreviewAndLengthHighlight();
    });
  });

  updateBowlingHudControllerButtons();
}

function toggleBowlingVariations() {
  window.bowlingVariationActive = !window.bowlingVariationActive;
  updateWheelVisuals();
}

function cycleWheelSelection(direction) {
  if (window.currentBowlingStep !== window.BOWLING_STEPS.SELECT_BALL_TYPE) return;
  window.activeWheelSector = (window.activeWheelSector + direction + 4) % 4;
  updateWheelVisuals();
}

function updateWheelVisuals() {
  const isSpinner = window.isBowlerSpinner(window.MATCH ? window.MATCH.bowlerName : null);

  document.querySelectorAll('.wheel-sector').forEach(sec => {
    const idx = parseInt(sec.getAttribute('data-index'));
    sec.classList.toggle('active', idx === window.activeWheelSector);

    const labelSpan = sec.querySelector('.sector-label');
    if (labelSpan) {
      if (isSpinner) {
        if (!window.bowlingVariationActive) {
          if (idx === 0) labelSpan.innerHTML = 'OFF-BREAK';
          if (idx === 1) labelSpan.innerHTML = 'LEG-BREAK';
          if (idx === 2) labelSpan.innerHTML = 'ARM BALL';
          if (idx === 3) labelSpan.innerHTML = 'TOP-SPIN';
        } else {
          if (idx === 0) labelSpan.innerHTML = 'DOOSRA';
          if (idx === 1) labelSpan.innerHTML = 'FLIPPER';
          if (idx === 2) labelSpan.innerHTML = 'CARROM';
          if (idx === 3) labelSpan.innerHTML = 'SLOWER';
        }
      } else {
        if (!window.bowlingVariationActive) {
          if (idx === 0) labelSpan.innerHTML = 'STANDARD';
          if (idx === 1) labelSpan.innerHTML = 'OUT-SWING';
          if (idx === 2) labelSpan.innerHTML = 'IN-SWING';
          if (idx === 3) labelSpan.innerHTML = 'SLOWER';
        } else {
          if (idx === 0) labelSpan.innerHTML = 'YORKER';
          if (idx === 1) labelSpan.innerHTML = 'OFF-CUTTER';
          if (idx === 2) labelSpan.innerHTML = 'LEG-CUTTER';
          if (idx === 3) labelSpan.innerHTML = 'BOUNCER';
        }
      }
    }
  });

  // Update the module-level deliveryType via window
  if (isSpinner) {
    if (!window.bowlingVariationActive) {
      if (window.activeWheelSector === 0) window.deliveryType = 'Off-break';
      if (window.activeWheelSector === 1) window.deliveryType = 'Leg-break';
      if (window.activeWheelSector === 2) window.deliveryType = 'Arm Ball';
      if (window.activeWheelSector === 3) window.deliveryType = 'Top-spinner';
    } else {
      if (window.activeWheelSector === 0) window.deliveryType = 'Doosra';
      if (window.activeWheelSector === 1) window.deliveryType = 'Flipper';
      if (window.activeWheelSector === 2) window.deliveryType = 'Carrom Ball';
      if (window.activeWheelSector === 3) window.deliveryType = 'Slower Ball';
    }
  } else {
    if (!window.bowlingVariationActive) {
      if (window.activeWheelSector === 0) window.deliveryType = 'Straight';
      if (window.activeWheelSector === 1) window.deliveryType = 'Out-swing';
      if (window.activeWheelSector === 2) window.deliveryType = 'In-swing';
      if (window.activeWheelSector === 3) window.deliveryType = 'Slower';
    } else {
      if (window.activeWheelSector === 0) window.deliveryType = 'FLAT YORKER';
      if (window.activeWheelSector === 1) window.deliveryType = 'Off-cutter';
      if (window.activeWheelSector === 2) window.deliveryType = 'Leg-cutter';
      if (window.activeWheelSector === 3) window.deliveryType = 'Bouncer';
    }
  }

  const wheelTitle = document.getElementById('bowling-wheel-title');
  if (wheelTitle && (window.currentBowlingStep === window.BOWLING_STEPS.SELECT_LOCATION ||
                     window.currentBowlingStep === window.BOWLING_STEPS.SELECT_BALL_TYPE)) {
    wheelTitle.innerText = window.bowlingVariationActive ? 'VARIATION' : 'DELIVERY';
  }
}

function updateAimPreviewAndLengthHighlight() {
  const z = window.MATCH.bowlingTargetZ;
  document.querySelectorAll('.length-item').forEach(item => item.classList.remove('active'));

  let lengthText;
  if (z > -0.5) {
    lengthText = 'YORKER';
    const el = document.getElementById('length-yorker');
    if (el) el.classList.add('active');
  } else if (z >= -2.75) {
    lengthText = 'FULL LENGTH';
    const el = document.getElementById('length-full');
    if (el) el.classList.add('active');
  } else if (z >= -5.5) {
    lengthText = 'GOOD LENGTH';
    const el = document.getElementById('length-good');
    if (el) el.classList.add('active');
  } else {
    lengthText = 'SHORT LENGTH';
    const el = document.getElementById('length-short');
    if (el) el.classList.add('active');
  }

  const x = window.MATCH.bowlingTargetX;
  let lineText;
  if      (x < -0.4)  lineText = 'WIDE OUTSIDE LEG';
  else if (x < -0.15) lineText = 'LEG STUMP';
  else if (x <= 0.15) lineText = 'ON STUMPS';
  else if (x <= 0.5)  lineText = 'OUTSIDE OFF';
  else                lineText = 'WIDE OUTSIDE OFF';

  const previewEl = document.getElementById('bowling-aim-preview');
  if (previewEl) previewEl.innerText = `Landing: ${lengthText}, ${lineText}`;

  updateBowlingHudControllerButtons();
}

function updateBowlingHudControllerButtons() {
  const isControllerActive = (window.gamepadIndex !== null || window.controllerConnected === true);
  
  // 1. Length item badges
  const yorkerBadge = document.querySelector('#length-yorker .btn-badge');
  const fullBadge = document.querySelector('#length-full .btn-badge');
  const goodBadge = document.querySelector('#length-good .btn-badge');
  const shortBadge = document.querySelector('#length-short .btn-badge');
  
  if (yorkerBadge) yorkerBadge.innerText = isControllerActive ? 'X' : '1';
  if (fullBadge) fullBadge.innerText = isControllerActive ? 'Y' : '2';
  if (goodBadge) goodBadge.innerText = isControllerActive ? 'A' : '3';
  if (shortBadge) shortBadge.innerText = isControllerActive ? 'B' : '4';

  // 2. Timing item badges
  const fasterBadge = document.querySelector('#timing-faster .btn-badge');
  const normalBadge = document.querySelector('#timing-normal .btn-badge');
  const slowerBadge = document.querySelector('#timing-slower .btn-badge');

  if (fasterBadge) fasterBadge.innerText = isControllerActive ? 'Y' : '1';
  if (normalBadge) normalBadge.innerText = isControllerActive ? 'A' : '2';
  if (slowerBadge) slowerBadge.innerText = isControllerActive ? 'B' : '3';

  // 3. Wheel center stick icon
  const stickIcon = document.querySelector('.wheel-center-stick .wheel-stick-icon');
  if (stickIcon) {
    stickIcon.innerText = isControllerActive ? 'L' : 'Q/E';
    stickIcon.style.fontSize = isControllerActive ? '0.9rem' : '0.65rem';
  }
}

window.initBowlingConsoleHud              = initBowlingConsoleHud;
window.toggleBowlingVariations            = toggleBowlingVariations;
window.cycleWheelSelection                = cycleWheelSelection;
window.updateWheelVisuals                 = updateWheelVisuals;
window.updateAimPreviewAndLengthHighlight = updateAimPreviewAndLengthHighlight;
window.updateBowlingHudControllerButtons  = updateBowlingHudControllerButtons;
