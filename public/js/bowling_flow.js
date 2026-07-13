// ── BOWLING FLOW ─────────────────────────────────────────────────
// Manages user bowling step-by-step flow:
// bowler selection → location → ball type → release meter.

function showBowlerSelection() {
  console.log('[DEBUG] showBowlerSelection called! currentBowlingStep:', window.currentBowlingStep);
  window.currentBowlingStep = window.BOWLING_STEPS.SELECT_BOWLER;
  populateBowlersList();
  const screen = document.getElementById('bowler-selection-screen');
  console.log('[DEBUG] showBowlerSelection screen:', screen, 'classList:', screen ? screen.className : 'null');
  if (screen) {
    screen.classList.remove('hidden');
    console.log('[DEBUG] showBowlerSelection screen hidden class removed! className now:', screen.className);
  }
}

function populateBowlersList() {
  console.log('[DEBUG] populateBowlersList called!');
  const grid = document.getElementById('bowler-selection-grid');
  if (!grid) {
    console.error('[DEBUG] bowler-selection-grid not found!');
    return;
  }
  grid.innerHTML = '';

  const userTeamVal = window.MATCH.userTeam || 'IND';
  const team = window.TEAMS[userTeamVal] || window.TEAMS.IND;
  console.log('[DEBUG] userTeamVal:', userTeamVal, 'team lineup:', team ? team.lineup : 'null');

  team.lineup.forEach((player, index) => {
    const isWK = (index === 4);
    let role = 'Bowler';
    if (index === 0 || index === 1) role = 'Opener';
    else if (index === 2 || index === 3) role = 'Batsman';
    else if (index === 4) role = 'WK';
    else if (index === 5 || index === 6) role = 'All-Rounder';

    const card = document.createElement('div');
    card.className = `bowler-card ${isWK ? 'disabled' : ''}`;
    if (isWK) {
      card.innerHTML = `<span>${player}</span><span class="bowler-role-badge wk">WK (CAN'T BOWL)</span>`;
    } else {
      card.innerHTML = `<span>${player}</span><span class="bowler-role-badge">${role}</span>`;
      card.addEventListener('click', () => selectBowler(player));
      
      // Sync mouse hover highlight
      card.addEventListener('mouseenter', () => {
        const eligibleCards = Array.from(grid.querySelectorAll('.bowler-card:not(.disabled)'));
        const idx = eligibleCards.indexOf(card);
        if (idx !== -1) {
          window.bowlerSelectNavHighlightIndex = idx;
          eligibleCards.forEach((c, cIdx) => {
            if (cIdx === idx) c.classList.add('nav-highlight');
            else c.classList.remove('nav-highlight');
          });
        }
      });
    }
    grid.appendChild(card);
  });

  window.bowlerSelectNavHighlightIndex = 0;
  const eligibleCards = Array.from(grid.querySelectorAll('.bowler-card:not(.disabled)'));
  if (eligibleCards.length > 0) {
    eligibleCards[0].classList.add('nav-highlight');
  }
}

function selectBowler(playerName) {
  console.log('[DEBUG-BOWLING-FLOW] selectBowler called! playerName:', playerName);
  if (typeof window.loadBowlerStats === 'function') {
    window.loadBowlerStats(playerName);
  } else {
    window.MATCH.bowlerName = playerName;
    if (window.ui && window.ui.bowlerName) window.ui.bowlerName.innerText = playerName;
  }
  const screen = document.getElementById('bowler-selection-screen');
  if (screen) screen.classList.add('hidden');
  startLocationSelection();
}

function startLocationSelection() {
  console.log('[DEBUG-BOWLING-FLOW] startLocationSelection called! targetX:', window.MATCH.bowlingTargetX, 'targetZ:', window.MATCH.bowlingTargetZ);
  window.currentBowlingStep = window.BOWLING_STEPS.SELECT_LOCATION;

  const isControllerActive = (window.gamepadIndex !== null || window.controllerConnected === true);
  if (isControllerActive) {
    window.ui.revealText.innerText = 'LEFT STICK TO AIM | X/Y/A/B PRESETS | A BUTTON TO LOCK';
  } else {
    window.ui.revealText.innerText = 'WASD TO AIM | 1-4 PRESETS | SPACE TO LOCK LOCATION';
  }
  window.ui.revealPanel.classList.add('visible');

  if (window.landingMarker) {
    window.landingMarker.position.set(window.MATCH.bowlingTargetX, 0.052, window.MATCH.bowlingTargetZ);
    window.landingMarker.material.opacity = 0.8;
    window.landingMarker.visible = true;
    console.log('[DEBUG-BOWLING-FLOW] landingMarker updated at position:', window.landingMarker.position);
  } else {
    console.warn('[DEBUG-BOWLING-FLOW] landingMarker is NULL/undefined!');
  }

  const consoleHud = document.getElementById('bowling-console-hud');
  if (consoleHud) {
    consoleHud.classList.remove('hidden');
    console.log('[DEBUG-BOWLING-FLOW] bowling-console-hud hidden class removed.');
  }

  const wheelCol = document.querySelector('#bowling-delivery-wheel')?.closest('.bowling-hud-column');
  if (wheelCol) wheelCol.style.display = 'none';

  const meterCol = document.getElementById('bowling-vertical-meter-col');
  if (meterCol) meterCol.style.display = 'none';

  const lengthContainer = document.getElementById('bowling-length-list-container');
  if (lengthContainer) lengthContainer.classList.remove('hidden');
  const timingContainer = document.getElementById('bowling-timing-list-container');
  if (timingContainer) timingContainer.classList.add('hidden');

  if (typeof window.activeWheelSector === 'undefined') window.activeWheelSector = 0;

  if (typeof window.initBowlingConsoleHud === 'function') {
    console.log('[DEBUG-BOWLING-FLOW] Calling initBowlingConsoleHud');
    window.initBowlingConsoleHud();
  }
  if (typeof window.updateAimPreviewAndLengthHighlight === 'function') {
    console.log('[DEBUG-BOWLING-FLOW] Calling updateAimPreviewAndLengthHighlight');
    window.updateAimPreviewAndLengthHighlight();
  }
}

function startBallTypeSelection() {
  console.log('[DEBUG-BOWLING-FLOW] startBallTypeSelection called!');
  window.currentBowlingStep = window.BOWLING_STEPS.SELECT_BALL_TYPE;

  const isControllerActive = (window.gamepadIndex !== null || window.controllerConnected === true);
  if (isControllerActive) {
    window.ui.revealText.innerText = 'LEFT STICK TO SELECT DELIVERY | A BUTTON TO START RUNUP';
  } else {
    window.ui.revealText.innerText = 'Q/E TO SELECT DELIVERY TYPE | SPACE TO START RUNUP';
  }
  window.ui.revealPanel.classList.add('visible');

  if (window.landingMarker) window.landingMarker.material.opacity = 0.5;

  const consoleHud = document.getElementById('bowling-console-hud');
  if (consoleHud) consoleHud.classList.remove('hidden');

  const wheelCol = document.querySelector('#bowling-delivery-wheel')?.closest('.bowling-hud-column');
  if (wheelCol) { wheelCol.style.display = ''; wheelCol.style.opacity = '1'; }

  document.querySelectorAll('.wheel-sector').forEach(s => {
    s.style.pointerEvents = '';
    s.style.opacity = '';
  });

  const meterCol = document.getElementById('bowling-vertical-meter-col');
  if (meterCol) meterCol.style.display = 'none';

  const lengthContainer = document.getElementById('bowling-length-list-container');
  if (lengthContainer) lengthContainer.classList.add('hidden');
  const timingContainer = document.getElementById('bowling-timing-list-container');
  if (timingContainer) timingContainer.classList.add('hidden');

  const wheelTitle = document.getElementById('bowling-wheel-title');
  if (wheelTitle) wheelTitle.innerText = 'DELIVERY';

  if (typeof window.updateWheelVisuals === 'function') {
    console.log('[DEBUG-BOWLING-FLOW] Calling updateWheelVisuals');
    window.updateWheelVisuals();
  }
}

function startReleaseMeter() {
  console.log('[DEBUG-BOWLING-FLOW] startReleaseMeter called!');
  window.currentBowlingStep = window.BOWLING_STEPS.RELEASE_METER;

  const isControllerActive = (window.gamepadIndex !== null || window.controllerConnected === true);
  if (isControllerActive) {
    window.ui.revealText.innerText = 'A BUTTON AT GREEN ZONE FOR PERFECT RELEASE';
  } else {
    window.ui.revealText.innerText = 'SPACE AT GREEN ZONE FOR PERFECT RELEASE';
  }
  window.ui.revealPanel.classList.add('visible');

  // Hide the reveal instruction panel after 1.2s so it doesn't block the screen during run-up
  setTimeout(() => {
    if (window.currentBowlingStep === window.BOWLING_STEPS.RELEASE_METER && window.ui && window.ui.revealPanel) {
      window.ui.revealPanel.classList.remove('visible');
    }
  }, 1200);

  if (window.landingMarker) window.landingMarker.material.opacity = 0.35;

  const consoleHud = document.getElementById('bowling-console-hud');
  if (consoleHud) consoleHud.classList.remove('hidden');

  const wheelCol = document.querySelector('#bowling-delivery-wheel')?.closest('.bowling-hud-column');
  if (wheelCol) wheelCol.style.display = '';

  const meterCol = document.getElementById('bowling-vertical-meter-col');
  if (meterCol) meterCol.style.display = 'flex';

  const lengthContainer = document.getElementById('bowling-length-list-container');
  if (lengthContainer) lengthContainer.classList.add('hidden');
  const timingContainer = document.getElementById('bowling-timing-list-container');
  if (timingContainer) timingContainer.classList.remove('hidden');

  const wheelTitle = document.getElementById('bowling-wheel-title');
  if (wheelTitle) wheelTitle.innerText = 'AFTERTOUCH';

  document.querySelectorAll('.wheel-sector').forEach(s => {
    s.style.pointerEvents = 'none';
    s.style.opacity = '0.4';
  });

  const feedback = document.getElementById('bowling-meter-feedback');
  if (feedback) { feedback.innerText = ''; feedback.className = 'vertical-meter-feedback'; }

  // Signal game.js to start bowler runup (via window flags)
  window.MATCH.bowlerRunupActive   = true;
  window.MATCH.bowlerRunupProgress = 0;
  window.MATCH.bowlerReleasePressed = false;
  window.MATCH.bowlerReleaseScore  = null;
  // The bowler anim state lives in game.js — signal via window
  window.bowlerAnimState = window.BOWLER_ANIM_STATES ? window.BOWLER_ANIM_STATES.RUNUP : 'RUNUP';
  window.bowlerAnimTime  = 0;
  window.bowlerReleased  = false;
  console.log('[Bowling] Runup started. bowlerAnimState set to:', window.bowlerAnimState);
}

function selectBallType(type) {
  console.log('[DEBUG-BOWLING-FLOW] selectBallType called! type:', type);
  window.deliveryType = type;
}

window.showBowlerSelection  = showBowlerSelection;
window.populateBowlersList  = populateBowlersList;
window.selectBowler         = selectBowler;
window.startLocationSelection  = startLocationSelection;
window.startBallTypeSelection  = startBallTypeSelection;
window.startReleaseMeter    = startReleaseMeter;
window.selectBallType       = selectBallType;
