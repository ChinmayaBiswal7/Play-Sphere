import { CricketAudio } from '../useCricketAudio.js?v=43';
import { setupProfileListeners } from './profile.js?v=43';

export function updateShotAimUI(angleRad) {
  const el = document.getElementById('radar-aim-cone');
  if (!el) return;
  el.classList.remove('hidden');

  const batsmanDot = document.getElementById('radar-batsman');
  if (batsmanDot) {
    el.style.left = batsmanDot.style.left;
    el.style.top = batsmanDot.style.top;
  }

  const angleDeg = angleRad * (180 / Math.PI);
  el.style.transform = `translate(-50%, -50%) rotate(${angleDeg}deg)`;

  const path = document.getElementById('radar-aim-cone-path');
  if (path) {
    const absAngle = Math.abs(angleRad);
    if (absAngle < Math.PI / 3) {
      path.setAttribute('fill', 'rgba(16, 185, 129, 0.45)');
      path.setAttribute('stroke', '#10b981');
    } else if (absAngle >= Math.PI / 3 && absAngle < 2 * Math.PI / 3) {
      path.setAttribute('fill', 'rgba(234, 179, 8, 0.45)');
      path.setAttribute('stroke', '#eab308');
    } else {
      path.setAttribute('fill', 'rgba(239, 68, 68, 0.45)');
      path.setAttribute('stroke', '#ef4444');
    }
  }
}

export function hideShotAimUI() {
  const el = document.getElementById('radar-aim-cone');
  if (el) { el.classList.add('hidden'); }
}

export function updateHUD() {
  const ui = window.ui;
  const MATCH = window.MATCH;
  const gameState = window.gameState;
  const STATES = window.STATES;

  // Update Team Score
  if (ui.runs) ui.runs.innerText = MATCH.runs;
  if (ui.wickets) ui.wickets.innerText = MATCH.wickets;
  if (ui.overs) ui.overs.innerText = MATCH.oversString;

  // Update Flag Colors
  const leftFlag = document.querySelector('.hud-flag-left');
  const rightFlag = document.querySelector('.hud-flag-right');
  const userTeamVal = MATCH.userTeam || 'IND';
  const oppTeamVal = MATCH.oppTeam || 'AUS';
  const userTeam = window.TEAMS[userTeamVal] || window.TEAMS.IND;
  const oppTeam = window.TEAMS[oppTeamVal] || window.TEAMS.AUS;
  const battingTeam = MATCH.userIsBatting ? userTeam : oppTeam;
  const fieldingTeam = MATCH.userIsBatting ? oppTeam : userTeam;
  if (leftFlag) leftFlag.style.backgroundColor = battingTeam.primary;
  if (rightFlag) rightFlag.style.backgroundColor = fieldingTeam.primary;

  // Update Equation
  if (MATCH.currentInnings === 1) {
    if (ui.targetRow) ui.targetRow.style.display = 'none';
    if (ui.runsNeeded) ui.runsNeeded.innerText = '–';
  } else {
    if (ui.targetRow) ui.targetRow.style.display = 'block';
    const runsNeeded = MATCH.target - MATCH.runs;
    if (ui.runsNeeded) ui.runsNeeded.innerText = Math.max(0, runsNeeded);
  }
  const ballsLeft = MATCH.maxBalls - MATCH.balls;
  if (ui.ballsLeft) ui.ballsLeft.innerText = Math.max(0, ballsLeft);

  // Update Batsman 1 (Striker)
  const bat1 = MATCH.batters[0];
  if (bat1) {
    if (ui.bat1Name) ui.bat1Name.innerText = bat1.name;
    if (ui.bat1Runs) ui.bat1Runs.innerText = bat1.runs;
    if (ui.bat1Balls) ui.bat1Balls.innerText = bat1.balls;
    if (ui.bat1Active) {
      if (MATCH.strikerIndex === 0) {
        ui.bat1Active.classList.remove('hud-hidden');
      } else {
        ui.bat1Active.classList.add('hud-hidden');
      }
    }
    if (ui.bat1Stamina) {
      ui.bat1Stamina.style.width = `${bat1.stamina}%`;
      if (bat1.stamina < 35) {
        ui.bat1Stamina.style.backgroundColor = '#ef4444';
      } else if (bat1.stamina < 65) {
        ui.bat1Stamina.style.backgroundColor = '#facc15';
      } else {
        ui.bat1Stamina.style.backgroundColor = '#10b981';
      }
    }
    if (ui.bat1Card) {
      if (MATCH.strikerIndex === 0) {
        ui.bat1Card.classList.add('active');
      } else {
        ui.bat1Card.classList.remove('active');
      }
    }
  }

  // Update Batsman 2 (Non-Striker)
  const bat2 = MATCH.batters[1];
  if (bat2) {
    if (ui.bat2Name) ui.bat2Name.innerText = bat2.name;
    if (ui.bat2Runs) ui.bat2Runs.innerText = bat2.runs;
    if (ui.bat2Balls) ui.bat2Balls.innerText = bat2.balls;
    if (ui.bat2Active) {
      if (MATCH.strikerIndex === 1) {
        ui.bat2Active.classList.remove('hud-hidden');
      } else {
        ui.bat2Active.classList.add('hud-hidden');
      }
    }
    if (ui.bat2Stamina) {
      ui.bat2Stamina.style.width = `${bat2.stamina}%`;
      if (bat2.stamina < 35) {
        ui.bat2Stamina.style.backgroundColor = '#ef4444';
      } else if (bat2.stamina < 65) {
        ui.bat2Stamina.style.backgroundColor = '#facc15';
      } else {
        ui.bat2Stamina.style.backgroundColor = '#10b981';
      }
    }
    if (ui.bat2Card) {
      if (MATCH.strikerIndex === 1) {
        ui.bat2Card.classList.add('active');
      } else {
        ui.bat2Card.classList.remove('active');
      }
    }
  }

  // Update Bowler HUD
  if (ui.bowlerWickets) ui.bowlerWickets.innerText = MATCH.bowlerWickets;
  if (ui.bowlerRuns) ui.bowlerRuns.innerText = MATCH.bowlerRuns;
  if (ui.bowlerOvers) ui.bowlerOvers.innerText = MATCH.bowlerOversString;

  // Update Over Tracker dots
  if (ui.overBallsTracker) {
    const circles = ui.overBallsTracker.querySelectorAll('.hud-ball-dot');
    const historyToDisplay = MATCH.overHistory || [];
    const startIdx = Math.max(0, historyToDisplay.length - 6);
    const activeBallIdx = MATCH.balls % 6;

    circles.forEach((circle, idx) => {
      // Find the outcome in history to show (shift by startIdx if history > 6)
      const historyIdx = historyToDisplay.length > 6 ? startIdx + idx : idx;

      if (idx === activeBallIdx && gameState === STATES.BOWL_READY) {
        circle.classList.add('active');
      } else {
        circle.classList.remove('active');
      }

      const outcome = historyToDisplay[historyIdx];
      if (outcome !== undefined) {
        circle.innerText = outcome;
        circle.className = 'hud-ball-dot';
        if (outcome === 'W') {
          circle.classList.add('out-dot');
        } else if (outcome === '6') {
          circle.classList.add('six-dot');
        } else if (outcome === '4') {
          circle.classList.add('four-dot');
        } else if (outcome === '0') {
          circle.classList.add('dot-dot');
        } else if (outcome.startsWith('Nb')) {
          circle.classList.add('noball-dot');
        } else {
          circle.classList.add('run-dot');
        }
      } else {
        circle.innerText = '○';
        circle.className = 'hud-ball-dot';
      }
    });
  }
}

export function showFeedback(timing, subtitle, timingClass) {
  const ui = window.ui;
  if (!ui.feedbackTiming || !ui.feedbackRun || !ui.feedbackPanel) return;

  // Gate score/result UI behind ballSettled flag
  const isScoreOrResult = subtitle && (
    subtitle.includes('RUNS') || 
    subtitle.includes('DOT') || 
    subtitle.includes('OUT') || 
    subtitle.includes('WICKET') || 
    subtitle.includes('CLEAN') || 
    subtitle.includes('CAUGHT')
  );
  if (isScoreOrResult && !window.ballSettled) {
    console.log("Suppressing premature feedback display before ballSettled");
    return;
  }

  ui.feedbackTiming.innerText = timing;
  ui.feedbackTiming.className = `feedback-timing ${timingClass}`;
  ui.feedbackRun.innerText = subtitle;
  
  if (subtitle.includes('6')) {
    ui.feedbackRun.className = 'feedback-run six';
  } else if (subtitle.includes('4')) {
    ui.feedbackRun.className = 'feedback-run four';
  } else if (timingClass === 'out') {
    ui.feedbackRun.className = 'feedback-run out';
  } else {
    ui.feedbackRun.className = 'feedback-run';
  }

  ui.feedbackPanel.classList.add('show');
  
  setTimeout(() => {
    ui.feedbackPanel.classList.remove('show');
  }, 2200);
}

export function showGameOverScreen() {
  const ui = window.ui;
  const MATCH = window.MATCH;

  if (!ui.gameOver) return;
  ui.gameOver.classList.remove('hidden');

  const rr = ((MATCH.runs / MATCH.balls) * 6).toFixed(1);
  if (ui.endScore) ui.endScore.innerText = `${MATCH.runs}/${MATCH.wickets}`;
  if (ui.endOvers) ui.endOvers.innerText = MATCH.oversString;
  if (ui.endRunrate) ui.endRunrate.innerText = isNaN(rr) ? '0.0' : rr;

  if (MATCH.runs >= MATCH.target) {
    if (ui.endTitle) {
      ui.endTitle.innerText = 'MATCH VICTORY!';
      ui.endTitle.className = 'victory';
    }
    if (ui.endSubtitle) ui.endSubtitle.innerText = 'Incredible batting! You chased down the target successfully.';
    if (window.showMatchTrophy) window.showMatchTrophy();
  } else {
    if (ui.endTitle) {
      ui.endTitle.innerText = 'MATCH DEFEAT';
      ui.endTitle.className = 'out';
    }
    if (ui.endSubtitle) ui.endSubtitle.innerText = 'The bowlers defended the total. Better luck next match!';
    if (window.cleanupMatchTrophy) window.cleanupMatchTrophy();
  }

  // Draw the wagon wheel after a short delay to ensure canvas rendering
  setTimeout(() => {
    drawWagonWheel();
  }, 120);
}export function triggerMatchLoading(onComplete, selectedStadiumVal = 'default') {
  const ui = window.ui;
  if (!ui.matchLoadingScreen) {
    onComplete();
    return;
  }

  // 1. Show loading screen
  ui.matchLoadingScreen.classList.remove('hidden');

  // 2. Transition audio state
  CricketAudio.transitionTo(CricketAudio.STATES.MATCH_LOADING);

  // 3. Randomize gameplay tips
  const tips = [
    "Time your shots carefully to clear the boundary ropes!",
    "Lofted shots (Left Ctrl) consume more stamina. Watch your fatigue!",
    "Strike rotates on odd runs (1 or 3 runs) and at the end of each over.",
    "Defensive stance (Left Shift) improves timing and helps block fast balls.",
    "Watch the bowler's release point to anticipate the bounce!",
    "Extras like wide balls and no-balls will award runs and extras to the batting side.",
    "Practice different shot angles by aim steering during your swing!"
  ];
  if (ui.loadingTip) {
    ui.loadingTip.innerText = tips[Math.floor(Math.random() * tips.length)];
  }

  // Reset status log line visual states
  for (let i = 1; i <= 5; i++) {
    const logEl = document.getElementById(`log-${i}`);
    if (logEl) {
      if (i === 1) logEl.classList.add('active');
      else logEl.classList.remove('active');
    }
  }

  if (ui.loadingStatusTxt) {
    ui.loadingStatusTxt.innerText = "PREPARING STADIUM...";
  }

  // Trigger loading the 3D stadium assets
  let stadiumLoaded = false;
  window.createStadium(selectedStadiumVal, () => {
    stadiumLoaded = true;
  });

  // Load players in parallel, but never replace them during a live delivery.
  let playersLoaded = !window._preloadFBXPlayers;
  if (window._preloadFBXPlayers) {
    window._preloadFBXPlayers().then(() => {
      console.log('[MatchLoading] FBX Players preloaded successfully! Re-creating players...');
      if (window.createPlayers) {
        window.createPlayers();
      }
      playersLoaded = true;
    }).catch(e => {
      console.warn('[FBXPlayers] Preload failed (using procedural fallback):', e);
      playersLoaded = true;
    });
  }

  const duration = 3500; // 3.5 seconds
  const startTime = performance.now();

  function animateLoading(time) {
    const elapsed = time - startTime;
    const progress = Math.min(1.0, elapsed / duration);

    // Update loader bar width and percentage text
    if (ui.matchLoaderBar) {
      ui.matchLoaderBar.style.width = `${progress * 100}%`;
    }
    if (ui.loadingPct) {
      ui.loadingPct.innerText = `${Math.round(progress * 100)}%`;
    }

    // Trigger sequential visual checkmark log reveals
    if (progress >= 0.23) {
      const log = document.getElementById('log-2');
      if (log) log.classList.add('active');
      if (ui.loadingStatusTxt && !stadiumLoaded) ui.loadingStatusTxt.innerText = "DOWNLOADING 3D STADIUM MODEL...";
      else if (ui.loadingStatusTxt) ui.loadingStatusTxt.innerText = "PLAYER PROFILE LOADED ✓";
    }
    if (progress >= 0.46) {
      const log = document.getElementById('log-3');
      if (log) log.classList.add('active');
      if (ui.loadingStatusTxt && !stadiumLoaded) ui.loadingStatusTxt.innerText = "DOWNLOADING 3D STADIUM MODEL...";
      else if (ui.loadingStatusTxt) ui.loadingStatusTxt.innerText = "PITCH PREPARED ✓";
    }
    if (progress >= 0.69) {
      const log = document.getElementById('log-4');
      if (log) log.classList.add('active');
      if (ui.loadingStatusTxt && !stadiumLoaded) ui.loadingStatusTxt.innerText = "DOWNLOADING 3D STADIUM MODEL...";
      else if (ui.loadingStatusTxt) ui.loadingStatusTxt.innerText = "CROWD ENTERING STADIUM ✓";
    }
    if (progress >= 0.91) {
      const log = document.getElementById('log-5');
      if (log) log.classList.add('active');
      if (ui.loadingStatusTxt && !stadiumLoaded) ui.loadingStatusTxt.innerText = "DOWNLOADING 3D STADIUM MODEL...";
      else if (ui.loadingStatusTxt) ui.loadingStatusTxt.innerText = "MATCH READY ✓";
    }

    if (progress < 1.0) {
      requestAnimationFrame(animateLoading);
    } else {
      // Wait for GLB stadium loading to finish
      function checkCompletion() {
        if (stadiumLoaded && playersLoaded) {
          setTimeout(() => {
            ui.matchLoadingScreen.classList.add('hidden');
            CricketAudio.transitionTo(CricketAudio.STATES.MATCH);
            onComplete();
          }, 300); // Tiny pause at 100% for satisfaction
        } else {
          if (ui.loadingStatusTxt) ui.loadingStatusTxt.innerText = stadiumLoaded
            ? "LOADING PLAYER MODELS & ANIMATIONS... PLEASE WAIT"
            : "DOWNLOADING 3D STADIUM MODEL... PLEASE WAIT";
          setTimeout(checkCompletion, 100);
        }
      }
      checkCompletion();
    }
  }

  requestAnimationFrame(animateLoading);
}

export function updateStanceUI() {
  const ui = window.ui;
  const controllerInput = window.controllerInput;
  const keys = window.keys;

  const isDefensive = controllerInput.btnCircle || keys.shift;
  const isLofted = controllerInput.btnTriangle || keys.ctrl;
  
  if (ui.stanceDefensive && ui.stanceNormal && ui.stanceLoft) {
    ui.stanceDefensive.classList.remove('active');
    ui.stanceNormal.classList.remove('active');
    ui.stanceLoft.classList.remove('active');

    if (isDefensive) {
      ui.stanceDefensive.classList.add('active');
    } else if (isLofted) {
      ui.stanceLoft.classList.add('active');
    } else {
      ui.stanceNormal.classList.add('active');
    }
  }
}

export function loadSettings() {
  const settings = window.settings;
  const saved = localStorage.getItem('apex_cricket_settings');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      Object.assign(settings, parsed);
    } catch (e) {
      console.error("Error parsing settings:", e);
    }
  }
  syncSettingsToUI();
  applySettings();
}

export function saveSettings() {
  const settings = window.settings;
  localStorage.setItem('apex_cricket_settings', JSON.stringify(settings));
  applySettings();
}

export function syncSettingsToUI() {
  const ui = window.ui;
  const settings = window.settings;

  if (ui.menuSettingGraphics) ui.menuSettingGraphics.value = settings.graphicsQuality;
  if (ui.menuSettingRes) ui.menuSettingRes.value = settings.resolutionScale;
  if (ui.menuSettingResVal) ui.menuSettingResVal.innerText = `${Math.round(settings.resolutionScale * 100)}%`;
  if (ui.menuSettingVolMaster) ui.menuSettingVolMaster.value = settings.masterVol;
  if (ui.menuSettingVolMasterVal) ui.menuSettingVolMasterVal.innerText = `${Math.round(settings.masterVol * 100)}%`;
  if (ui.menuSettingVolSfx) ui.menuSettingVolSfx.value = settings.sfxVol;
  if (ui.menuSettingVolSfxVal) ui.menuSettingVolSfxVal.innerText = `${Math.round(settings.sfxVol * 100)}%`;
  if (ui.menuSettingVolCrowd) ui.menuSettingVolCrowd.value = settings.crowdVol;
  if (ui.menuSettingVolCrowdVal) ui.menuSettingVolCrowdVal.innerText = `${Math.round(settings.crowdVol * 100)}%`;

  if (ui.pauseSettingGraphics) ui.pauseSettingGraphics.value = settings.graphicsQuality;
  if (ui.pauseSettingVolMaster) ui.pauseSettingVolMaster.value = settings.masterVol;
  if (ui.pauseSettingVolSfx) ui.pauseSettingVolSfx.value = settings.sfxVol;
  if (ui.pauseSettingVolCrowd) ui.pauseSettingVolCrowd.value = settings.crowdVol;
}

export function applySettings() {
  const settings = window.settings;
  const renderer = window.renderer;
  const scene = window.scene;

  CricketAudio.setVolumes(settings.masterVol, settings.sfxVol, settings.crowdVol);

  if (!renderer) return;

  if (settings.graphicsQuality === 'low') {
    renderer.shadowMap.enabled = false;
    renderer.setPixelRatio(settings.resolutionScale * 0.8);
    scene.traverse(node => {
      if (node.isLight) node.castShadow = false;
    });
  } else if (settings.graphicsQuality === 'medium') {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(settings.resolutionScale * 1.0);
    scene.traverse(node => {
      if (node.isLight && (node.type === 'SpotLight' || node.type === 'DirectionalLight')) {
        node.castShadow = true;
        if (node.shadow) {
          node.shadow.mapSize.width = 512;
          node.shadow.mapSize.height = 512;
        }
      }
    });
  } else if (settings.graphicsQuality === 'high') {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(settings.resolutionScale * window.devicePixelRatio);
    scene.traverse(node => {
      if (node.isLight && (node.type === 'SpotLight' || node.type === 'DirectionalLight')) {
        node.castShadow = true;
        if (node.shadow) {
          node.shadow.mapSize.width = 2048;
          node.shadow.mapSize.height = 2048;
        }
      }
    });
  }
}

export function setupSettingsListeners() {
  const ui = window.ui;
  const settings = window.settings;

  setupProfileListeners();

  if (ui.menuSettingGraphics) {
    ui.menuSettingGraphics.onchange = () => {
      settings.graphicsQuality = ui.menuSettingGraphics.value;
      saveSettings();
      syncSettingsToUI();
    };
  }
  if (ui.menuSettingRes) {
    ui.menuSettingRes.oninput = () => {
      const val = parseFloat(ui.menuSettingRes.value);
      if (ui.menuSettingResVal) ui.menuSettingResVal.innerText = `${Math.round(val * 100)}%`;
      settings.resolutionScale = val;
      saveSettings();
      syncSettingsToUI();
    };
  }
  if (ui.menuSettingVolMaster) {
    ui.menuSettingVolMaster.oninput = () => {
      const val = parseFloat(ui.menuSettingVolMaster.value);
      if (ui.menuSettingVolMasterVal) ui.menuSettingVolMasterVal.innerText = `${Math.round(val * 100)}%`;
      settings.masterVol = val;
      saveSettings();
      syncSettingsToUI();
    };
  }
  if (ui.menuSettingVolSfx) {
    ui.menuSettingVolSfx.oninput = () => {
      const val = parseFloat(ui.menuSettingVolSfx.value);
      if (ui.menuSettingVolSfxVal) ui.menuSettingVolSfxVal.innerText = `${Math.round(val * 100)}%`;
      settings.sfxVol = val;
      saveSettings();
      syncSettingsToUI();
    };
  }
  if (ui.menuSettingVolCrowd) {
    ui.menuSettingVolCrowd.oninput = () => {
      const val = parseFloat(ui.menuSettingVolCrowd.value);
      if (ui.menuSettingVolCrowdVal) ui.menuSettingVolCrowdVal.innerText = `${Math.round(val * 100)}%`;
      settings.crowdVol = val;
      saveSettings();
      syncSettingsToUI();
    };
  }
  if (ui.menuBtnSaveSettings) {
    ui.menuBtnSaveSettings.onclick = () => {
      saveSettings();
      CricketAudio.playHit(0.5);
    };
  }

  if (ui.pauseSettingGraphics) {
    ui.pauseSettingGraphics.onchange = () => {
      settings.graphicsQuality = ui.pauseSettingGraphics.value;
      saveSettings();
      syncSettingsToUI();
    };
  }
  if (ui.pauseSettingVolMaster) {
    ui.pauseSettingVolMaster.oninput = () => {
      settings.masterVol = parseFloat(ui.pauseSettingVolMaster.value);
      saveSettings();
      syncSettingsToUI();
    };
  }
  if (ui.pauseSettingVolSfx) {
    ui.pauseSettingVolSfx.oninput = () => {
      settings.sfxVol = parseFloat(ui.pauseSettingVolSfx.value);
      saveSettings();
      syncSettingsToUI();
    };
  }
  if (ui.pauseSettingVolCrowd) {
    ui.pauseSettingVolCrowd.oninput = () => {
      settings.crowdVol = parseFloat(ui.pauseSettingVolCrowd.value);
      saveSettings();
      syncSettingsToUI();
    };
  }

  // ── FULLSCREEN TOGGLE ──────────────────────────────────────────
  function applyFullscreen(enter) {
    if (enter) {
      const el = document.documentElement;
      const req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
      if (req) req.call(el);
    } else {
      const exit = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
      if (exit) exit.call(document);
    }
  }

  function updateFullscreenBtnLabel() {
    const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
    if (ui.fullscreenBtn) {
      ui.fullscreenBtn.innerText = isFs ? 'EXIT FULLSCREEN' : 'GO FULLSCREEN';
      ui.fullscreenBtn.style.background = isFs
        ? 'rgba(236, 72, 153, 0.2)'
        : 'rgba(30, 41, 59, 0.6)';
      ui.fullscreenBtn.style.borderColor = isFs
        ? 'rgba(236, 72, 153, 0.5)'
        : 'rgba(255, 255, 255, 0.15)';
    }
  }

  if (ui.fullscreenBtn) {
    ui.fullscreenBtn.onclick = () => {
      const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
      applyFullscreen(!isFs);
      CricketAudio.playHit(0.3);
    };
  }

  document.addEventListener('fullscreenchange', updateFullscreenBtnLabel);
  document.addEventListener('webkitfullscreenchange', updateFullscreenBtnLabel);
  document.addEventListener('mozfullscreenchange', updateFullscreenBtnLabel);
  document.addEventListener('MSFullscreenChange', updateFullscreenBtnLabel);
}

// ── NEW PRESENTATION LAYER HELPERS ──────────────────────────────

export function drawWagonWheel() {
  const canvas = document.getElementById('wagon-wheel-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const r = cx - 10;

  // Clear
  ctx.clearRect(0, 0, w, h);

  // Outfield circle
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)'; // green boundary line
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Pitch rectangle in center
  ctx.fillStyle = 'rgba(200, 169, 110, 0.5)'; // tan
  ctx.fillRect(cx - 3, cy - 20, 6, 40);

  // Draw wagon wheel lines
  const shots = window.MATCH.wagonWheel || [];
  shots.forEach(s => {
    const dx = Math.sin(s.angle) * r * (Math.min(s.distance, 55) / 55);
    const dy = Math.cos(s.angle) * r * (Math.min(s.distance, 55) / 55);

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + dx, cy + dy);

    // Color by runs
    let color = '#94a3b8'; // grey for dots
    if (s.runs === 1) color = '#38bdf8'; // blue
    else if (s.runs === 2) color = '#eab308'; // yellow
    else if (s.runs === 3) color = '#f97316'; // orange
    else if (s.runs === 4) color = '#3b82f6'; // dark blue
    else if (s.runs === 6) color = '#ec4899'; // pink

    ctx.strokeStyle = color;
    ctx.lineWidth = s.runs >= 4 ? 2.5 : 1.5;
    ctx.stroke();

    // Dot at the end
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx + dx, cy + dy, s.runs >= 4 ? 3.5 : 2.5, 0, Math.PI * 2);
    ctx.fill();
  });
}

export function showBroadcastCelebration(title, subtitle, theme = '') {
  const ui = window.ui;
  if (!ui || !ui.broadcastOverlay || !ui.broadcastTitle || !ui.broadcastSubtitle) return;

  if (theme !== 'out' && !window.ballSettled) {
    console.log("Suppressing premature broadcast celebration before ballSettled");
    return;
  }

  const content = ui.broadcastOverlay.querySelector('.broadcast-overlay-content');
  if (content) {
    content.className = 'broadcast-overlay-content'; // reset base class
    if (theme === 'four') {
      content.classList.add('four-theme');
    } else if (theme === 'six') {
      content.classList.add('six-theme');
    } else if (theme === 'out') {
      content.classList.add('out-theme');
    }
  }

  ui.broadcastTitle.innerText = title;
  ui.broadcastSubtitle.innerText = subtitle;
  ui.broadcastOverlay.classList.remove('hidden');

  // Play clatter/hit audio context warm up
  if (window.CricketAudio && window.CricketAudio.playHit) {
    window.CricketAudio.playHit(0.5);
  }

  setTimeout(() => {
    ui.broadcastOverlay.classList.add('hidden');
  }, 1500);




}

export function showShotCard(footwork, timing, timingClass, choice, choiceClass) {
  const ui = window.ui;
  if (!ui || !ui.shotCard) return;

  // Map timing labels to emojis
  let timingEmoji = '⚪';
  if (timingClass === 'perfect' || timingClass === 'ideal') timingEmoji = '🟢';
  else if (timingClass === 'good') timingEmoji = '🟩';
  else if (timingClass === 'early' || timingClass === 'late') timingEmoji = '🟨';
  else if (timingClass === 'veryearly' || timingClass === 'verylate') timingEmoji = '🟧';
  else if (timingClass === 'poor' || timingClass === 'missed') timingEmoji = '🔴';

  let footworkEmoji = '🟢';
  if (footwork === 'POOR') footworkEmoji = '🔴';
  else if (footwork === 'GOOD') footworkEmoji = '🟩';

  let choiceEmoji = '🟢';
  if (choiceClass === 'perfect' || choiceClass === 'ideal') choiceEmoji = '🟢';
  else if (choiceClass === 'good') choiceEmoji = '🟩';
  else if (choiceClass === 'poor' || choiceClass === 'missed') choiceEmoji = '🔴';

  if (ui.ratingFootwork) {
    ui.ratingFootwork.innerText = `${footworkEmoji} ${footwork}`;
    ui.ratingFootwork.className = `shot-badge rating-${footwork.toLowerCase().replace(/\s+/g, '')}`;
  }
  if (ui.ratingTiming) {
    ui.ratingTiming.innerText = `${timingEmoji} ${timing}`;
    ui.ratingTiming.className = `shot-badge rating-${timingClass}`;
  }
  if (ui.ratingChoice) {
    ui.ratingChoice.innerText = `${choiceEmoji} ${choice}`;
    ui.ratingChoice.className = `shot-badge rating-${choiceClass}`;
  }

  ui.shotCard.classList.remove('hidden');

  if (window.shotCardTimeout) clearTimeout(window.shotCardTimeout);
  window.shotCardTimeout = setTimeout(() => {
    ui.shotCard.classList.add('hidden');
  }, 3200);
}

// Staggers Umpire signaling close-up focus (4.0s) first, then shows presentation flash cards (2.5s)
export function queueCelebration(type, title, subtitle, feedbackMain, feedbackSub, feedbackClass, soundFn) {
  try {
    if (window.replaySystem) {
      window.replaySystem.isRecording = false;
    }
    window.MATCH.ballDead = true;

    if (type === 'out') {
      if (soundFn) soundFn();
      if (typeof window.startWicketCutscene === 'function') {
        window.startWicketCutscene();
      }
      return;
    }

    // Freeze the ball immediately on trigger
    if (window.ballBody) {
      window.ballBody.velocity.set(0, 0, 0);
      window.ballBody.angularVelocity.set(0, 0, 0);
      if (window.CANNON && window.CANNON.Body) {
        window.ballBody.type = window.CANNON.Body.STATIC;
      } else {
        window.ballBody.type = 2; // STATIC
      }
    }

    // Play audio/sound effect immediately (e.g. stumps clatter, gasps, or crowd cheers)
    if (soundFn) soundFn();

    if (type === 'field') {
      console.log(`[queueCelebration] type=field. Transitioning immediately to RESULT.`);
      if (window.showFeedback) {
        window.showFeedback(feedbackMain, feedbackSub, feedbackClass);
      }
      window.setGameState(window.STATES.RESULT);
      return;
    } else {
      // 1. Immediately trigger Umpire signal for boundary (four/six)
      // Ensure ballSettled is true so broadcast/feedback panels can show
      window.ballSettled = true;
      window.umpireSignalType = type;
      window.umpireSignalTimer = 0;

      // 2. Wait exactly 4.0 seconds (Umpire signals on camera)
      setTimeout(() => {
        // Clear umpire signal type so umpire goes back to idle
        window.umpireSignalType = null;

        // 3. Trigger fullscreen celebration card
        if (window.showBroadcastCelebration) {
          window.showBroadcastCelebration(title, subtitle, type);
        }
        // 4. Trigger HUD feedback banner
        if (window.showFeedback) {
          window.showFeedback(feedbackMain, feedbackSub, feedbackClass);
        }

        // 5. Wait exactly 2.5 seconds (displaying presentation cards), then transition to Replay (and then to RESULT)
        setTimeout(() => {
          // Cleanly hide broadcast card overlay if showing
          const ui = window.ui;
          if (ui && ui.broadcastOverlay) {
            ui.broadcastOverlay.classList.add('hidden');
          }

          if (window.replaySystem) {
            window.replaySystem.startReplay(() => {
              window.setGameState(window.STATES.RESULT);
            });
          } else {
            window.setGameState(window.STATES.RESULT);
          }
        }, 2500);

      }, 4000);
    }
  } catch (err) {
    console.error('[CRASH] Error inside queueCelebration:', err);
    fetch('/log', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ type: 'error', msg: 'CRASH inside queueCelebration: ' + err.message, stack: err.stack })
    }).catch(() => {});
  }
}

export function updateCreaseTracker(progress, runningActive) {
  const ui = window.ui;
  if (!ui || !ui.creaseTracker || !ui.strikerDot || !ui.nonstrikerDot) return;

  if (runningActive) {
    ui.creaseTracker.classList.remove('hidden');
    
    // We check if the striker is currently starting at the batting end (Z > -10.6) or bowling end (Z < -10.6)
    // Initially BATSMAN_CREASE_Z is 1.2 (batting crease), nonStrikerStartZ is -22.4 (bowling crease).
    // Batting crease (1.2) represents the left end of the visualizer (WK side).
    // Bowling crease (-22.4) represents the right end of the visualizer.
    const isStrikerAtBattingEnd = (window.BATSMAN_CREASE_Z > -10.6);

    let strikerPos, nonstrikerPos;
    const strikerSvg = ui.strikerDot.querySelector('svg');
    const nonstrikerSvg = ui.nonstrikerDot.querySelector('svg');

    if (isStrikerAtBattingEnd) {
      // Striker runs from batting end (left: 0%) to bowler end (right: 100%)
      strikerPos = progress * 100;
      nonstrikerPos = (1 - progress) * 100;

      // Orient SVGs: striker running to right (scaleX(1)), non-striker running to left (scaleX(-1))
      if (strikerSvg) strikerSvg.style.transform = 'scaleX(1)';
      if (nonstrikerSvg) nonstrikerSvg.style.transform = 'scaleX(-1)';
    } else {
      // Striker runs from bowler end (right: 100%) to batting end (left: 0%)
      strikerPos = (1 - progress) * 100;
      nonstrikerPos = progress * 100;

      // Orient SVGs: striker running to left (scaleX(-1)), non-striker running to right (scaleX(1))
      if (strikerSvg) strikerSvg.style.transform = 'scaleX(-1)';
      if (nonstrikerSvg) nonstrikerSvg.style.transform = 'scaleX(1)';
    }

    ui.strikerDot.style.left = `${strikerPos}%`;
    ui.nonstrikerDot.style.left = `${nonstrikerPos}%`;
  } else {
    ui.creaseTracker.classList.add('hidden');
  }
}

// Bind UI cache elements
if (window.ui) {
  window.ui.creaseTracker = document.getElementById('crease-tracker-container');
  window.ui.strikerDot = document.getElementById('crease-striker-dot');
  window.ui.nonstrikerDot = document.getElementById('crease-nonstriker-dot');
  window.ui.shotCard = document.getElementById('shot-rating-card');
  window.ui.ratingFootwork = document.getElementById('rating-footwork');
  window.ui.ratingTiming = document.getElementById('rating-timing');
  window.ui.ratingChoice = document.getElementById('rating-choice');
  window.ui.broadcastOverlay = document.getElementById('broadcast-overlay');
  window.ui.broadcastTitle = document.getElementById('broadcast-title');
  window.ui.broadcastSubtitle = document.getElementById('broadcast-subtitle');
}

window.updateShotAimUI = updateShotAimUI;
window.hideShotAimUI = hideShotAimUI;
window.updateHUD = updateHUD;
window.showFeedback = showFeedback;
window.showGameOverScreen = showGameOverScreen;
window.triggerMatchLoading = triggerMatchLoading;
window.updateStanceUI = updateStanceUI;
window.loadSettings = loadSettings;
window.saveSettings = saveSettings;
window.applySettings = applySettings;
window.setupSettingsListeners = setupSettingsListeners;
window.drawWagonWheel = drawWagonWheel;
window.showBroadcastCelebration = showBroadcastCelebration;
window.showShotCard = showShotCard;
window.queueCelebration = queueCelebration;
window.updateCreaseTracker = updateCreaseTracker;
