// ── UI MENUS ────────────────────────────────────────────────────
// Handles splash screen, main menu, pause, and navigation.

function runSplashScreen() {
  let progress = 0;
  if (window.CricketAudio) window.CricketAudio.init();

  const interval = setInterval(() => {
    progress += 2.5;
    window.ui.loaderBar.style.width = `${progress}%`;

    const loadMessages = [
      "MOWING OUTFIELD GRASS...",
      "PREPARING PITCH CREASE...",
      "TUNING AUDIENCE AUDIO ENGINE...",
      "POLLING CONTROLLER SOCKETS...",
      "TURNING ON STADIUM FLOODLIGHTS...",
      "CALIBRATING SEAMLESS PHYSICS...",
      "SYNCHRONIZING DUALSENSE HAPTICS...",
      "MATCH READY!"
    ];
    const msgIdx = Math.min(loadMessages.length - 1, Math.floor((progress / 100) * loadMessages.length));
    const taglineEl = document.querySelector('.splash-tagline');
    if (taglineEl) taglineEl.innerText = loadMessages[msgIdx];

    if (progress >= 50 && !window.ui.splashLogo1.classList.contains('hidden')) {
      window.ui.splashLogo1.classList.add('hidden');
      window.ui.splashLogo2.classList.remove('hidden');
      if (window.CricketAudio) window.CricketAudio.playHit(0.5);
    }

    if (progress >= 100) {
      clearInterval(interval);
      setTimeout(() => {
        window.ui.splash.style.opacity = 0;
        window.ui.splash.style.visibility = 'hidden';
        window.ui.mainMenu.classList.remove('hidden');
        if (typeof window.setGameState === 'function') window.setGameState(window.STATES.MAIN_MENU);
      }, 500);
    }
  }, 70);
}

function exitToMainMenu() {
  if (window.socket) {
    window.socket.disconnect();
    window.socket = null;
  }
  window.roomCode = null;
  window.controllerConnected = false;
  window.prematchLineupSelected = false;

  window.ui.lobby.classList.add('hidden');
  window.ui.hud.style.display = 'none';
  window.ui.gameOver.classList.add('hidden');
  window.ui.controlsScreen.classList.add('hidden');
  window.ui.mainMenu.classList.remove('hidden');

  if (typeof window.setGameState === 'function') window.setGameState(window.STATES.MAIN_MENU);
  if (window.CricketAudio) window.CricketAudio.transitionTo(window.CricketAudio.STATES.MENU);
}

function setupMenuListeners() {
  const menuItems = [
    { id: 'menu-opt-solo',     detailId: 'detail-solo' },
    { id: 'menu-opt-pvp',      detailId: 'detail-pvp' },
    { id: 'menu-opt-help',     detailId: 'detail-controls' },
    { id: 'menu-opt-settings', detailId: 'detail-settings' }
  ];

  menuItems.forEach(item => {
    const el = document.getElementById(item.id);
    if (!el) return;

    el.onclick = () => {
      document.querySelectorAll('.fc-menu-item').forEach(m => m.classList.remove('active'));
      el.classList.add('active');
      document.querySelectorAll('.detail-content').forEach(d => d.classList.add('hidden'));
      const det = document.getElementById(item.detailId);
      if (det) det.classList.remove('hidden');
      if (window.CricketAudio) window.CricketAudio.playHit(0.3);
      if (item.id === 'menu-opt-settings') {
        if (window.ui.mainMenu) window.ui.mainMenu.classList.add('hidden');
        if (window.ui.settingsScreen) window.ui.settingsScreen.classList.remove('hidden');
      }
    };
    el.onmouseenter = () => {
      document.querySelectorAll('.fc-menu-item').forEach(m => m.classList.remove('active'));
      el.classList.add('active');
      document.querySelectorAll('.detail-content').forEach(d => d.classList.add('hidden'));
      const det = document.getElementById(item.detailId);
      if (det) det.classList.remove('hidden');
    };
  });

  const soloOvers = document.getElementById('solo-overs');
  if (soloOvers) {
    soloOvers.onchange = () => {
      const targetInput = document.getElementById('solo-target');
      if (targetInput) targetInput.value = parseInt(soloOvers.value) * 12;
    };
  }
  const pvpOvers = document.getElementById('pvp-overs');
  if (pvpOvers) {
    pvpOvers.onchange = () => {
      const targetInput = document.getElementById('pvp-target');
      if (targetInput) targetInput.value = parseInt(pvpOvers.value) * 12;
    };
  }

  document.getElementById('menu-btn-solo').onclick = () => {
    window.ui.mainMenu.classList.add('hidden');
    document.getElementById('matchup-screen').classList.remove('hidden');
    if (typeof window.randomizeConditions === 'function') window.randomizeConditions();
    if (typeof window.updateMatchupScreenUI === 'function') window.updateMatchupScreenUI();
  };

  // Open the Dashboard Friends modal to challenge a friend online
  const pvpFriendBtn = document.getElementById('menu-btn-pvp-friend');
  if (pvpFriendBtn) {
    pvpFriendBtn.onclick = () => {
      if (window.friendsManager && typeof window.friendsManager.openFriendsModal === 'function') {
        window.friendsManager.openFriendsModal();
      } else {
        alert("Please sign in from the profile hub to challenge online friends.");
      }
    };
  }

  // Handle random matchmaking search for Cricket Pro
  let cricketSearching = false;
  const pvpRandomBtn = document.getElementById('menu-btn-pvp-random');
  const mmStatus = document.getElementById('cricket-mm-status');
  const mmTitle = document.getElementById('cricket-mm-title');

  if (pvpRandomBtn) {
    pvpRandomBtn.onclick = () => {
      if (!window.currentUser) {
        alert("Please sign in from the profile hub to participate in online matchmaking.");
        return;
      }
      if (typeof window.initSocket === 'function') window.initSocket();

      const socket = window.socket;
      if (!socket) {
        alert("Connecting to server... Please try again in a moment.");
        return;
      }

      if (cricketSearching) {
        // Cancel Search
        socket.emit('ps-matchmaking-cancel');
        cricketSearching = false;
        if (mmStatus) mmStatus.classList.add('hidden');
        pvpRandomBtn.innerHTML = `
          <div>
            <div style="font-weight: 800; font-size: 0.85rem; color: #fff; display: flex; align-items: center; gap: 6px;">🌐 QUICK MATCHMAKING</div>
            <div style="font-size: 0.65rem; color: rgba(255,255,255,0.45); font-weight: 500; margin-top: 3px;">Search and match with another player instantly</div>
          </div>
          <span style="font-size: 1rem; color: rgba(255,255,255,0.45);">➔</span>
        `;
      } else {
        // Join Matchmaking Queue
        const profile = window.profile || {};
        socket.emit('ps-matchmaking-join', {
          game: 'cricket',
          uid: window.currentUser.uid,
          username: profile.username || 'Gamer'
        });

        // Set state to searching
        cricketSearching = true;
        if (mmStatus) mmStatus.classList.remove('hidden');
        if (mmTitle) mmTitle.innerText = "SEARCHING OPPONENT...";
        pvpRandomBtn.innerHTML = `
          <div>
            <div style="font-weight: 800; font-size: 0.85rem; color: #f87171; display: flex; align-items: center; gap: 6px;">🔴 CANCEL SEARCH</div>
            <div style="font-size: 0.65rem; color: rgba(255,255,255,0.45); font-weight: 500; margin-top: 3px;">Click to cancel looking for matches</div>
          </div>
          <span style="font-size: 1rem; color: rgba(255,255,255,0.45);">➔</span>
        `;
      }
    };
  }

  // Socket response for matchmaking cancelled/error
  const bindCricketMMSocket = () => {
    if (window.socket) {
      window.socket.on('ps-matchmaking-cancelled', () => {
        cricketSearching = false;
        if (mmStatus) mmStatus.classList.add('hidden');
      });
      window.socket.on('ps-matchmaking-error', (msg) => {
        cricketSearching = false;
        if (mmStatus) mmStatus.classList.add('hidden');
        alert("Matchmaking Error: " + msg);
      });
    } else {
      setTimeout(bindCricketMMSocket, 800);
    }
  };
  bindCricketMMSocket();

  document.getElementById('menu-btn-help').onclick = () => {
    window.ui.mainMenu.classList.add('hidden');
    window.ui.controlsScreen.classList.remove('hidden');
  };

  const menuBtnSettings = document.getElementById('menu-btn-settings');
  if (menuBtnSettings) {
    menuBtnSettings.onclick = () => {
      if (window.ui.mainMenu) window.ui.mainMenu.classList.add('hidden');
      if (window.ui.settingsScreen) window.ui.settingsScreen.classList.remove('hidden');
      if (window.CricketAudio) window.CricketAudio.playHit(0.4);
      if (window.ui.settingsBackBtn) {
        window.ui.settingsBackBtn.onclick = () => {
          if (window.ui.settingsScreen) window.ui.settingsScreen.classList.add('hidden');
          if (window.ui.mainMenu) window.ui.mainMenu.classList.remove('hidden');
          if (window.CricketAudio) window.CricketAudio.playHit(0.4);
        };
      }
    };
  }

  if (window.ui.settingsBackBtn) {
    window.ui.settingsBackBtn.onclick = () => {
      if (window.ui.settingsScreen) window.ui.settingsScreen.classList.add('hidden');
      if (window.ui.mainMenu) window.ui.mainMenu.classList.remove('hidden');
      if (window.CricketAudio) window.CricketAudio.playHit(0.4);
    };
  }

  document.getElementById('controls-back-btn').onclick = () => {
    window.ui.controlsScreen.classList.add('hidden');
    window.ui.mainMenu.classList.remove('hidden');
  };

  document.getElementById('lobby-back-btn').onclick = () => { exitToMainMenu(); };

  document.getElementById('end-restart-btn').onclick = () => {
    window.ui.gameOver.classList.add('hidden');
    if (typeof window.triggerMatchLoading === 'function') {
      window.triggerMatchLoading(() => { if (typeof window.restartMatch === 'function') window.restartMatch(); });
    }
  };

  document.getElementById('end-menu-btn').onclick = () => { exitToMainMenu(); };
}

function setupPauseListeners() {
  const resumeBtn  = document.getElementById('pause-resume-btn');
  const restartBtn = document.getElementById('pause-restart-btn');
  const menuBtn    = document.getElementById('pause-menu-btn');

  if (resumeBtn)  resumeBtn.onclick  = () => { if (typeof window.togglePause === 'function') window.togglePause(); };
  if (restartBtn) restartBtn.onclick = () => {
    if (typeof window.togglePause === 'function') window.togglePause();
    if (typeof window.triggerMatchLoading === 'function') {
      window.triggerMatchLoading(() => { if (typeof window.restartMatch === 'function') window.restartMatch(); });
    }
  };
  if (menuBtn) menuBtn.onclick = () => {
    if (typeof window.togglePause === 'function') window.togglePause();
    exitToMainMenu();
  };

  const cameraBtns = document.querySelectorAll('.camera-btn');
  cameraBtns.forEach(btn => {
    btn.onclick = () => {
      cameraBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      window.activeCameraMode = btn.getAttribute('data-camera');
      console.log(`Camera mode: ${window.activeCameraMode}`);
    };
  });
}

// Inject high-fidelity navigation outline style for gamepad/keyboard menu control
(function() {
  const style = document.createElement('style');
  style.textContent = `
    .nav-highlight {
      outline: 3px solid #3b82f6 !important;
      outline-offset: 2px;
      box-shadow: 0 0 15px rgba(59, 130, 246, 0.6) !important;
      transform: scale(1.03);
    }
  `;
  document.head.appendChild(style);
})();

window.handleUINavigation = function(action) {
  // check if Team Selection overlay is active
  const teamSelOverlay = document.getElementById('team-selection-overlay');
  if (teamSelOverlay && !teamSelOverlay.classList.contains('hidden')) {
    let key = '';
    if (action === 'UP') key = 'ArrowUp';
    else if (action === 'DOWN') key = 'ArrowDown';
    else if (action === 'LEFT') key = 'ArrowLeft';
    else if (action === 'RIGHT') key = 'ArrowRight';
    else if (action === 'SELECT') key = 'Enter';
    else if (action === 'BACK') key = 'Escape';
    
    if (typeof window.handleTeamSelNavigation === 'function') {
      window.handleTeamSelNavigation(key);
    }
    return;
  }

  // check if Lineup Editor overlay is active
  const lineupOverlay = document.getElementById('lineup-editor-overlay');
  if (lineupOverlay && !lineupOverlay.classList.contains('hidden')) {
    let key = '';
    if (action === 'UP') key = 'ArrowUp';
    else if (action === 'DOWN') key = 'ArrowDown';
    else if (action === 'LEFT') key = 'ArrowLeft';
    else if (action === 'RIGHT') key = 'ArrowRight';
    else if (action === 'SELECT') key = 'Enter';
    else if (action === 'BACK') key = 'Escape';

    if (typeof window.handleLineupNavigation === 'function') {
      window.handleLineupNavigation(key);
    }
    return;
  }

  // 1. MAIN MENU SCREEN
  const isMainMenuActive = window.ui && window.ui.mainMenu && !window.ui.mainMenu.classList.contains('hidden');
  if (isMainMenuActive) {
    const items = Array.from(document.querySelectorAll('.fc-menu-item'));
    let activeIndex = items.findIndex(item => item.classList.contains('active'));
    if (activeIndex === -1) activeIndex = 0;

    if (action === 'UP') {
      activeIndex = (activeIndex - 1 + items.length) % items.length;
      items[activeIndex].dispatchEvent(new MouseEvent('mouseenter'));
      if (window.CricketAudio && window.CricketAudio.playHit) window.CricketAudio.playHit(0.25);
    } else if (action === 'DOWN') {
      activeIndex = (activeIndex + 1) % items.length;
      items[activeIndex].dispatchEvent(new MouseEvent('mouseenter'));
      if (window.CricketAudio && window.CricketAudio.playHit) window.CricketAudio.playHit(0.25);
    } else if (action === 'SELECT') {
      const activeItem = items[activeIndex];
      if (activeItem) {
        const target = activeItem.getAttribute('data-target');
        if (target === 'solo') {
          const btn = document.getElementById('menu-btn-solo');
          if (btn) btn.click();
        } else if (target === 'pvp') {
          const btn = document.getElementById('menu-btn-pvp');
          if (btn) btn.click();
        } else if (target === 'controls') {
          const btn = document.getElementById('menu-btn-help');
          if (btn) btn.click();
        } else if (target === 'settings') {
          const btn = document.getElementById('menu-btn-settings');
          if (btn) btn.click();
        } else if (target === 'quit') {
          activeItem.click();
        }
      }
    }
    return;
  }

  // 2. MATCHUP SCREEN (KICK OFF PREVIEW)
  const matchupScreen = document.getElementById('matchup-screen');
  if (matchupScreen && !matchupScreen.classList.contains('hidden')) {
    const panels = [
      document.getElementById('faceoff-panel-home'),
      document.getElementById('faceoff-panel-away')
    ].filter(Boolean);

    const actionButtons = [
      document.getElementById('matchup-btn-start'),
      document.getElementById('matchup-btn-settings'),
      document.getElementById('matchup-btn-lineup'),
      document.getElementById('matchup-btn-back')
    ].filter(Boolean);

    // Find currently highlighted
    let isPanelFocused = panels.some(p => p.classList.contains('focused'));
    let activeIndex = -1;

    if (isPanelFocused) {
      activeIndex = panels.findIndex(p => p.classList.contains('focused'));
      if (action === 'LEFT' || action === 'RIGHT') {
        panels[activeIndex].classList.remove('focused');
        activeIndex = (activeIndex === 0) ? 1 : 0;
        panels[activeIndex].classList.add('focused');
        if (window.CricketAudio && window.CricketAudio.playHit) window.CricketAudio.playHit(0.25);
      } else if (action === 'DOWN') {
        panels[activeIndex].classList.remove('focused');
        activeIndex = activeIndex === 0 ? 0 : 2; // drop to Start or Lineup
        actionButtons[activeIndex].classList.add('nav-highlight');
        if (window.CricketAudio && window.CricketAudio.playHit) window.CricketAudio.playHit(0.25);
      } else if (action === 'SELECT') {
        panels[activeIndex].classList.remove('focused');
        panels[activeIndex].click();
      }
    } else {
      activeIndex = actionButtons.findIndex(btn => btn.classList.contains('nav-highlight'));
      if (activeIndex === -1) {
        activeIndex = 0;
        actionButtons[0].classList.add('nav-highlight');
      }

      if (action === 'LEFT') {
        actionButtons[activeIndex].classList.remove('nav-highlight');
        activeIndex = (activeIndex - 1 + actionButtons.length) % actionButtons.length;
        actionButtons[activeIndex].classList.add('nav-highlight');
        if (window.CricketAudio && window.CricketAudio.playHit) window.CricketAudio.playHit(0.25);
      } else if (action === 'RIGHT') {
        actionButtons[activeIndex].classList.remove('nav-highlight');
        activeIndex = (activeIndex + 1) % actionButtons.length;
        actionButtons[activeIndex].classList.add('nav-highlight');
        if (window.CricketAudio && window.CricketAudio.playHit) window.CricketAudio.playHit(0.25);
      } else if (action === 'UP') {
        actionButtons[activeIndex].classList.remove('nav-highlight');
        const panelIdx = activeIndex < 2 ? 0 : 1; // map left buttons to left panel, right to right
        if (panels[panelIdx]) {
          panels[panelIdx].classList.add('focused');
        }
        if (window.CricketAudio && window.CricketAudio.playHit) window.CricketAudio.playHit(0.25);
      } else if (action === 'SELECT') {
        actionButtons[activeIndex].classList.remove('nav-highlight');
        actionButtons[activeIndex].click();
      } else if (action === 'BACK') {
        actionButtons.forEach(btn => btn.classList.remove('nav-highlight'));
        const backBtn = document.getElementById('matchup-btn-back');
        if (backBtn) backBtn.click();
      }
    }
    return;
  }

  // 3. TOSS SCREEN
  const tossScreen = document.getElementById('toss-screen');
  if (tossScreen && !tossScreen.classList.contains('hidden')) {
    let visibleButtons = [];
    const flipBtn = document.getElementById('toss-btn-flip');
    const callContainer = document.getElementById('toss-call-container');
    const choicesContainer = document.getElementById('toss-choices-container');
    const proceedContainer = document.getElementById('toss-proceed-container');

    if (flipBtn && flipBtn.offsetHeight > 0) {
      visibleButtons.push(flipBtn);
    } else if (callContainer && !callContainer.classList.contains('hidden')) {
      visibleButtons.push(document.getElementById('toss-btn-heads'), document.getElementById('toss-btn-tails'));
    } else if (choicesContainer && !choicesContainer.classList.contains('hidden')) {
      visibleButtons.push(document.getElementById('toss-btn-bat'), document.getElementById('toss-btn-bowl'));
    } else if (proceedContainer && !proceedContainer.classList.contains('hidden')) {
      visibleButtons.push(document.getElementById('toss-btn-proceed'));
    }

    visibleButtons = visibleButtons.filter(Boolean);
    if (visibleButtons.length === 0) return;

    let activeIndex = visibleButtons.findIndex(btn => btn.classList.contains('nav-highlight'));
    if (activeIndex === -1) {
      activeIndex = 0;
      visibleButtons[0].classList.add('nav-highlight');
    }

    if (action === 'LEFT' || action === 'UP') {
      visibleButtons[activeIndex].classList.remove('nav-highlight');
      activeIndex = (activeIndex - 1 + visibleButtons.length) % visibleButtons.length;
      visibleButtons[activeIndex].classList.add('nav-highlight');
      if (window.CricketAudio && window.CricketAudio.playHit) window.CricketAudio.playHit(0.25);
    } else if (action === 'RIGHT' || action === 'DOWN') {
      visibleButtons[activeIndex].classList.remove('nav-highlight');
      activeIndex = (activeIndex + 1) % visibleButtons.length;
      visibleButtons[activeIndex].classList.add('nav-highlight');
      if (window.CricketAudio && window.CricketAudio.playHit) window.CricketAudio.playHit(0.25);
    } else if (action === 'SELECT') {
      visibleButtons[activeIndex].classList.remove('nav-highlight');
      visibleButtons[activeIndex].click();
    }
    return;
  }

  // 4. CUTSCENES (ENTRANCE / WICKET)
  if (action === 'SELECT') {
    if (window.entranceCutsceneActive) {
      if (typeof window.skipEntranceCutscene === 'function') window.skipEntranceCutscene();
      return;
    }
    if (window.wicketCutsceneActive) {
      if (typeof window.skipWicketCutscene === 'function') window.skipWicketCutscene();
      return;
    }
  }

  // 4b. MATCH INTRO SCREEN
  const introScreen = document.getElementById('match-intro-screen');
  if (introScreen && !introScreen.classList.contains('hidden')) {
    if (action === 'SELECT') {
      if (typeof window.proceedFromMatchIntro === 'function') window.proceedFromMatchIntro();
    }
    return;
  }

  // 4c. SELECT OPENING LINEUP SCREEN (PREMATCH BATSMAN SELECTION)
  const prematchScreen = document.getElementById('prematch-batsman-selection-screen');
  if (prematchScreen && !prematchScreen.classList.contains('hidden')) {
    const playersGrid = document.getElementById('prematch-players-grid');
    const confirmBtn = document.getElementById('prematch-confirm-btn');
    let activeIndex = window.prematchNavHighlightIndex;
    if (activeIndex === undefined) activeIndex = 0;

    if (action === 'UP') {
      activeIndex = (activeIndex - 1 + 12) % 12;
    } else if (action === 'DOWN') {
      activeIndex = (activeIndex + 1) % 12;
    } else if (action === 'SELECT') {
      if (activeIndex === 11) {
        if (confirmBtn && !confirmBtn.classList.contains('disabled')) {
          confirmBtn.click();
        }
      } else {
        if (playersGrid && playersGrid.children[activeIndex]) {
          playersGrid.children[activeIndex].click();
        }
      }
      return;
    }

    window.prematchNavHighlightIndex = activeIndex;
    if (playersGrid) {
      Array.from(playersGrid.children).forEach((row, idx) => {
        if (idx === activeIndex) row.classList.add('nav-highlight');
        else row.classList.remove('nav-highlight');
      });
    }
    if (confirmBtn) {
      if (activeIndex === 11) confirmBtn.classList.add('nav-highlight');
      else confirmBtn.classList.remove('nav-highlight');
    }

    // Auto-scroll the active player row into view
    if (playersGrid && activeIndex >= 0 && activeIndex < 11) {
      const activeRow = playersGrid.children[activeIndex];
      if (activeRow) activeRow.scrollIntoView({ block: 'nearest' });
    }

    if (window.CricketAudio && window.CricketAudio.playHit) window.CricketAudio.playHit(0.25);
    return;
  }

  // 4d. PAUSE SETTINGS SCREEN
  const pauseScreen = document.getElementById('pause-settings-screen');
  if (pauseScreen && !pauseScreen.classList.contains('hidden')) {
    const cameraButtons = Array.from(pauseScreen.querySelectorAll('.camera-btn'));
    const actionButtons = [
      document.getElementById('pause-resume-btn'),
      document.getElementById('pause-restart-btn'),
      document.getElementById('pause-menu-btn')
    ].filter(Boolean);

    let rowIndex = window.pauseNavRowIndex;
    let colIndex = window.pauseNavColIndex;
    if (rowIndex === undefined) { rowIndex = 1; colIndex = 0; } // default to Resume button

    if (action === 'UP') {
      rowIndex = (rowIndex - 1 + 2) % 2;
      colIndex = 0;
    } else if (action === 'DOWN') {
      rowIndex = (rowIndex + 1) % 2;
      colIndex = 0;
    } else if (action === 'LEFT') {
      const limit = (rowIndex === 0) ? cameraButtons.length : actionButtons.length;
      colIndex = (colIndex - 1 + limit) % limit;
    } else if (action === 'RIGHT') {
      const limit = (rowIndex === 0) ? cameraButtons.length : actionButtons.length;
      colIndex = (colIndex + 1) % limit;
    } else if (action === 'SELECT') {
      const targetBtn = (rowIndex === 0) ? cameraButtons[colIndex] : actionButtons[colIndex];
      if (targetBtn) {
        targetBtn.classList.remove('nav-highlight');
        targetBtn.click();
      }
      return;
    } else if (action === 'BACK') {
      const resumeBtn = document.getElementById('pause-resume-btn');
      if (resumeBtn) resumeBtn.click();
      return;
    }

    window.pauseNavRowIndex = rowIndex;
    window.pauseNavColIndex = colIndex;

    cameraButtons.forEach(btn => btn.classList.remove('nav-highlight'));
    actionButtons.forEach(btn => btn.classList.remove('nav-highlight'));

    const highlightedBtn = (rowIndex === 0) ? cameraButtons[colIndex] : actionButtons[colIndex];
    if (highlightedBtn) highlightedBtn.classList.add('nav-highlight');

    if (window.CricketAudio && window.CricketAudio.playHit) window.CricketAudio.playHit(0.25);
    return;
  }

  // 4e. BOWLER SELECTION SIDEBAR
  const bowlerScreen = document.getElementById('bowler-selection-screen');
  if (bowlerScreen && !bowlerScreen.classList.contains('hidden')) {
    const eligibleCards = Array.from(document.querySelectorAll('#bowler-selection-grid .bowler-card:not(.disabled)'));
    if (eligibleCards.length > 0) {
      let activeIndex = window.bowlerSelectNavHighlightIndex;
      if (activeIndex === undefined || activeIndex >= eligibleCards.length) activeIndex = 0;

      if (action === 'UP') {
        activeIndex = (activeIndex - 1 + eligibleCards.length) % eligibleCards.length;
      } else if (action === 'DOWN') {
        activeIndex = (activeIndex + 1) % eligibleCards.length;
      } else if (action === 'SELECT') {
        if (eligibleCards[activeIndex]) eligibleCards[activeIndex].click();
        return;
      }

      window.bowlerSelectNavHighlightIndex = activeIndex;
      eligibleCards.forEach((card, idx) => {
        if (idx === activeIndex) card.classList.add('nav-highlight');
        else card.classList.remove('nav-highlight');
      });

      if (eligibleCards[activeIndex]) {
        eligibleCards[activeIndex].scrollIntoView({ block: 'nearest' });
      }
      if (window.CricketAudio && window.CricketAudio.playHit) window.CricketAudio.playHit(0.25);
    }
    return;
  }

  // 4f. BATSMAN SELECTION SIDEBAR
  const batsmanScreen = document.getElementById('batsman-selection-screen');
  if (batsmanScreen && !batsmanScreen.classList.contains('hidden')) {
    const eligibleCards = Array.from(document.querySelectorAll('#batsman-selection-grid .bowler-card:not(.disabled)'));
    if (eligibleCards.length > 0) {
      let activeIndex = window.batsmanSelectNavHighlightIndex;
      if (activeIndex === undefined || activeIndex >= eligibleCards.length) activeIndex = 0;

      if (action === 'UP') {
        activeIndex = (activeIndex - 1 + eligibleCards.length) % eligibleCards.length;
      } else if (action === 'DOWN') {
        activeIndex = (activeIndex + 1) % eligibleCards.length;
      } else if (action === 'SELECT') {
        if (eligibleCards[activeIndex]) eligibleCards[activeIndex].click();
        return;
      }

      window.batsmanSelectNavHighlightIndex = activeIndex;
      eligibleCards.forEach((card, idx) => {
        if (idx === activeIndex) card.classList.add('nav-highlight');
        else card.classList.remove('nav-highlight');
      });

      if (eligibleCards[activeIndex]) {
        eligibleCards[activeIndex].scrollIntoView({ block: 'nearest' });
      }
      if (window.CricketAudio && window.CricketAudio.playHit) window.CricketAudio.playHit(0.25);
    }
    return;
  }

  // 5. INNINGS BREAK SCREEN
  const breakScreen = document.getElementById('innings-break-screen');
  if (breakScreen && !breakScreen.classList.contains('hidden')) {
    if (action === 'SELECT') {
      if (typeof window.proceedFromInningsBreak === 'function') window.proceedFromInningsBreak();
    }
    return;
  }

  // 6. GAME OVER SCREEN
  const gameOverScreen = document.getElementById('game-over');
  if (gameOverScreen && !gameOverScreen.classList.contains('hidden')) {
    const buttons = [
      document.getElementById('end-restart-btn'),
      document.getElementById('end-menu-btn')
    ].filter(Boolean);

    let activeIndex = buttons.findIndex(btn => btn.classList.contains('nav-highlight'));
    if (activeIndex === -1) {
      activeIndex = 0;
      if (buttons[0]) buttons[0].classList.add('nav-highlight');
    }

    if (action === 'LEFT') {
      buttons[activeIndex].classList.remove('nav-highlight');
      activeIndex = (activeIndex - 1 + buttons.length) % buttons.length;
      buttons[activeIndex].classList.add('nav-highlight');
      if (window.CricketAudio && window.CricketAudio.playHit) window.CricketAudio.playHit(0.25);
    } else if (action === 'RIGHT') {
      buttons[activeIndex].classList.remove('nav-highlight');
      activeIndex = (activeIndex + 1) % buttons.length;
      buttons[activeIndex].classList.add('nav-highlight');
      if (window.CricketAudio && window.CricketAudio.playHit) window.CricketAudio.playHit(0.25);
    } else if (action === 'SELECT') {
      buttons[activeIndex].classList.remove('nav-highlight');
      buttons[activeIndex].click();
    }
    return;
  }

  // 7. CONTROLS BACK OR SETTINGS BACK SCREENS
  if (action === 'BACK') {
    const controlsScreen = document.getElementById('controls-screen');
    if (controlsScreen && !controlsScreen.classList.contains('hidden')) {
      const backBtn = document.getElementById('controls-back-btn');
      if (backBtn) backBtn.click();
      return;
    }
    const settingsScreen = document.getElementById('settings-screen');
    if (settingsScreen && !settingsScreen.classList.contains('hidden')) {
      const backBtn = document.getElementById('settings-back-btn') || window.ui.settingsBackBtn;
      if (backBtn) backBtn.click();
      return;
    }
  }
};

window.runSplashScreen     = runSplashScreen;
window.exitToMainMenu      = exitToMainMenu;
window.setupMenuListeners  = setupMenuListeners;
window.setupPauseListeners = setupPauseListeners;
