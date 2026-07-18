/**
 * PlaySphere Cricket Pro 2026 — Real-time Online PvP Synchronization Module
 * Fully handles:
 *   - Turn-based selection (Team, Lineup, Stadium, Overs)
 *   - Coin Toss selection and result sync
 *   - Ball delivery (marker, delivery type, vertical meter)
 *   - Batting swing timing and physics replication
 *   - Running calls and wicket synchronization
 */

(function () {
  'use strict';

  // ── PvP Session State ───────────────────────────────────────────────────────
  window.cricketPvPRole = null; // 'host' or 'guest'
  let pvpSetupState = {
    step: 'team_select', // 'team_select', 'stadium_select', 'ready_to_play'
    hostTeam: null,
    guestTeam: null,
    hostLineupReady: false,
    guestLineupReady: false,
    stadium: 'default',
    overs: 2,
    hostSettingsConfirmed: false,
    guestConfirmed: false
  };

  let originalUpdateMatchupScreenUI = null;

  // ── Core PvP Initializer ────────────────────────────────────────────────────
  window.cricketPvPInit = function (matchData) {
    window.matchMode = window.MODES.PVP;
    window.roomCode = matchData.roomCode;
    window.cricketPvPRole = (window.socket.id === matchData.host.socketId) ? 'host' : 'guest';

    console.log(`[PvP] Client initialized. Role: ${window.cricketPvPRole}, Room: ${matchData.roomCode}`);

    // Join room
    window.socket.emit('ps-game-join', {
      roomCode: matchData.roomCode,
      game: 'cricket',
      isHost: window.cricketPvPRole === 'host'
    });

    // Reset local team selectors
    pvpSetupState = {
      step: 'team_select',
      hostTeam: null,
      guestTeam: null,
      hostLineupReady: false,
      guestLineupReady: false,
      stadium: 'default',
      overs: 2,
      hostSettingsConfirmed: false,
      guestConfirmed: false
    };

    // Show native matchup screen directly
    const matchupScreen = document.getElementById('matchup-screen');
    if (matchupScreen) matchupScreen.classList.remove('hidden');

    const backBtn = document.getElementById('matchup-btn-back');
    if (backBtn) backBtn.style.display = 'none';

    bindPvPSocketListeners();
    hijackMatchupScreen();
    updatePvPLobbyUI();
  };

  // ── Hijack Native Match Preview UI controls ──
  function hijackMatchupScreen() {
    const isHost = (window.cricketPvPRole === 'host');
    const panelHome = document.getElementById('faceoff-panel-home');
    const panelAway = document.getElementById('faceoff-panel-away');
    const settingsBtn = document.getElementById('matchup-btn-settings');
    const lineupBtn = document.getElementById('matchup-btn-lineup');
    const startBtn = document.getElementById('matchup-btn-start');

    // Hijack Left (home) panel click
    if (panelHome) {
      panelHome.onclick = () => {
        if (pvpSetupState.step !== 'team_select') return;
        if (isHost && !pvpSetupState.hostTeam) {
          if (typeof window.openTeamSelection === 'function') window.openTeamSelection('home');
        } else {
          showStatusHint("Waiting for P1 to select home team.");
        }
      };
    }

    // Hijack Right (away) panel click
    if (panelAway) {
      panelAway.onclick = () => {
        if (pvpSetupState.step !== 'team_select') return;
        if (!isHost && pvpSetupState.hostTeam && !pvpSetupState.guestTeam) {
          if (typeof window.openTeamSelection === 'function') window.openTeamSelection('away');
        } else if (!pvpSetupState.hostTeam) {
          showStatusHint("Waiting for P1 to choose team first.");
        } else {
          showStatusHint("Waiting for P2 to select away team.");
        }
      };
    }

    // Hijack settings button
    if (settingsBtn) {
      settingsBtn.onclick = () => {
        if (pvpSetupState.step !== 'stadium_select') {
          showStatusHint("Select teams first before changing settings.");
          return;
        }
        if (isHost) {
          const settingsModal = document.getElementById('match-settings-modal');
          if (settingsModal) settingsModal.classList.remove('hidden');
        } else {
          showStatusHint("Only the Host can configure match settings.");
        }
      };
    }

    // Hijack lineup manager button
    if (lineupBtn) {
      lineupBtn.onclick = () => {
        if (pvpSetupState.step !== 'stadium_select') {
          showStatusHint("Select teams first before editing lineup.");
          return;
        }
        if (typeof window.openLineupEditor === 'function') {
          window.openLineupEditor();
        }
      };
    }

    // Hijack start button click
    if (startBtn) {
      startBtn.onclick = () => {
        if (!pvpSetupState.hostSettingsConfirmed) {
          showStatusHint("Confirm match settings first.");
          return;
        }
        if (!pvpSetupState.hostLineupReady || !pvpSetupState.guestLineupReady) {
          showStatusHint("Waiting for both players to confirm their lineups.");
          return;
        }
        if (isHost) {
          // Tell Guest to start toss
          window.socket.emit('ps-game-message', {
            roomCode: window.roomCode,
            event: 'cricket-start-match',
            data: {}
          });
          document.getElementById('matchup-screen').classList.add('hidden');
          launchPVPGame();
        }
      };
    }

    // Intercept native Captains faceoff updates
    if (!originalUpdateMatchupScreenUI) {
      originalUpdateMatchupScreenUI = window.updateMatchupScreenUI;
    }
    window.updateMatchupScreenUI = function () {
      if (typeof originalUpdateMatchupScreenUI === 'function') {
        originalUpdateMatchupScreenUI();
      }

      // Check if team choice changed and send update
      if (isHost && window.MATCH.userTeam && window.MATCH.userTeam !== pvpSetupState.hostTeam) {
        pvpSetupState.hostTeam = window.MATCH.userTeam;
        window.socket.emit('ps-game-message', {
          roomCode: window.roomCode,
          event: 'cricket-select-team',
          data: { role: 'host', team: window.MATCH.userTeam }
        });
        updatePvPLobbyUI();
      } else if (!isHost && window.MATCH.oppTeam && window.MATCH.oppTeam !== pvpSetupState.guestTeam) {
        pvpSetupState.guestTeam = window.MATCH.oppTeam;
        window.socket.emit('ps-game-message', {
          roomCode: window.roomCode,
          event: 'cricket-select-team',
          data: { role: 'guest', team: window.MATCH.oppTeam }
        });
        updatePvPLobbyUI();
      }
    };

    // Close Settings modal hijack to sync conditions
    const closeSettingsBtn = document.getElementById('settings-modal-close-btn');
    if (closeSettingsBtn) {
      closeSettingsBtn.onclick = () => {
        const modal = document.getElementById('match-settings-modal');
        if (modal) modal.classList.add('hidden');

        const stadiumVal = document.getElementById('matchup-stadium').value;
        const oversVal = parseInt(document.getElementById('matchup-overs').value);

        pvpSetupState.stadium = stadiumVal;
        pvpSetupState.overs = oversVal;
        pvpSetupState.hostSettingsConfirmed = true;

        // Sync to guest
        window.socket.emit('ps-game-message', {
          roomCode: window.roomCode,
          event: 'cricket-select-conditions',
          data: { stadium: stadiumVal, overs: oversVal }
        });

        updatePvPLobbyUI();
      };
    }

    // Hijack Lineup Close (Escape or back) to sync ready state
    const originalCloseLineup = window.closeLineupEditor;
    window.closeLineupEditor = function () {
      if (typeof originalCloseLineup === 'function') originalCloseLineup();

      window.socket.emit('ps-game-message', {
        roomCode: window.roomCode,
        event: 'cricket-ready-lineup',
        data: { role: window.cricketPvPRole }
      });

      if (isHost) {
        pvpSetupState.hostLineupReady = true;
      } else {
        pvpSetupState.guestLineupReady = true;
      }
      updatePvPLobbyUI();
    };
  }

  // ── Sync UI State ──────────────────────────────────────────────────────────
  function updatePvPLobbyUI() {
    const isHost = (window.cricketPvPRole === 'host');
    const panelHome = document.getElementById('faceoff-panel-home');
    const panelAway = document.getElementById('faceoff-panel-away');
    const startBtn = document.getElementById('matchup-btn-start');
    const settingsBtn = document.getElementById('matchup-btn-settings');
    const lineupBtn = document.getElementById('matchup-btn-lineup');

    // Feed selection back to local MATCH state
    if (pvpSetupState.hostTeam) {
      window.MATCH.userTeam = pvpSetupState.hostTeam;
    }
    if (pvpSetupState.guestTeam) {
      window.MATCH.oppTeam = pvpSetupState.guestTeam;
    }

    if (originalUpdateMatchupScreenUI) {
      originalUpdateMatchupScreenUI();
    }

    const hintHome = panelHome ? panelHome.querySelector('.faceoff-edit-hint') : null;
    const hintAway = panelAway ? panelAway.querySelector('.faceoff-edit-hint') : null;

    // Step 1: Team Select Phase
    if (pvpSetupState.step === 'team_select') {
      if (startBtn) startBtn.style.display = 'none';
      if (settingsBtn) settingsBtn.style.display = 'none';
      if (lineupBtn) lineupBtn.style.display = 'none';

      if (!pvpSetupState.hostTeam) {
        if (hintHome) hintHome.innerText = isHost ? "CLICK TO SELECT HOME TEAM" : "WAITING FOR HOST TO SELECT...";
        if (hintAway) hintAway.innerText = "WAITING FOR TEAM 1...";
      } else if (!pvpSetupState.guestTeam) {
        if (hintHome) hintHome.innerText = "HOME TEAM SELECTED";
        if (hintAway) hintAway.innerText = isHost ? "WAITING FOR OPPONENT TO SELECT..." : "CLICK TO SELECT AWAY TEAM";
      } else {
        pvpSetupState.step = 'stadium_select';
        updatePvPLobbyUI();
      }
    }

    // Step 2: Settings & Lineups Phase
    else if (pvpSetupState.step === 'stadium_select') {
      if (hintHome) hintHome.innerText = "TEAM READY";
      if (hintAway) hintAway.innerText = "TEAM READY";

      if (settingsBtn) settingsBtn.style.display = 'block';
      if (lineupBtn) lineupBtn.style.display = 'block';

      if (!pvpSetupState.hostSettingsConfirmed) {
        if (startBtn) startBtn.style.display = 'none';
        showStatusHint(isHost ? "Configure Match Settings (Stadium/Overs) to unlock start." : "Waiting for Host to configure Match Settings...");
      } else {
        // Sync setting selectors
        const stadiumSelect = document.getElementById('matchup-stadium');
        const oversSelect = document.getElementById('matchup-overs');
        if (stadiumSelect) stadiumSelect.value = pvpSetupState.stadium;
        if (oversSelect) oversSelect.value = String(pvpSetupState.overs);
        if (originalUpdateMatchupScreenUI) originalUpdateMatchupScreenUI();

        if (startBtn) startBtn.style.display = 'block';

        // Check if lineups are ready
        if (!pvpSetupState.hostLineupReady || !pvpSetupState.guestLineupReady) {
          if (startBtn) {
            startBtn.disabled = true;
            startBtn.innerText = "WAITING FOR LINEUPS...";
            startBtn.style.opacity = '0.5';
          }
          let hintText = "Configure your lineup!";
          if (isHost && pvpSetupState.hostLineupReady) hintText = "Waiting for Guest lineup...";
          if (!isHost && pvpSetupState.guestLineupReady) hintText = "Waiting for Host lineup...";
          showStatusHint(hintText);
        } else {
          if (startBtn) {
            startBtn.disabled = !isHost;
            startBtn.style.opacity = isHost ? '1' : '0.5';
            startBtn.innerText = isHost ? "START MATCH" : "WAITING FOR HOST TO START...";
          }
          showStatusHint(isHost ? "Both players ready! Press START MATCH to begin." : "Both players ready! Waiting for Host to start...");
        }
      }
    }
  }

  function showStatusHint(text) {
    const mmTitle = document.getElementById('faceoff-match-mode-title');
    if (mmTitle) {
      mmTitle.innerText = `PVP | ${text.toUpperCase()}`;
    }
  }

  // ── Launch Game ─────────────────────────────────────────────────────────────
  function launchPVPGame() {
    window.MATCH.userTeam = pvpSetupState.hostTeam;
    window.MATCH.oppTeam = pvpSetupState.guestTeam;
    window.MATCH.maxBalls = pvpSetupState.overs * 6;
    window.currentStadiumVal = pvpSetupState.stadium;

    console.log(`[PvP] Launching PvP Game. HostTeam: ${window.MATCH.userTeam}, GuestTeam: ${window.MATCH.oppTeam}`);

    if (typeof window.triggerMatchLoading === 'function') {
      window.triggerMatchLoading(() => {
        if (window.ui && window.ui.hud) {
          window.ui.hud.style.display = 'flex';
          if (window.ui.hudMode) window.ui.hudMode.innerText = 'ONLINE PVP';
        }
        setGameState(window.STATES.BOWL_READY); 
        startPvPToss();
      });
    }
  }

  // ── Real-time Coin Toss Sync ────────────────────────────────────────────────
  function startPvPToss() {
    const tossScreen = document.getElementById('toss-screen');
    if (!tossScreen) return;
    tossScreen.classList.remove('hidden');

    const flipBtn = document.getElementById('toss-btn-flip');
    const headsBtn = document.getElementById('toss-btn-heads');
    const tailsBtn = document.getElementById('toss-btn-tails');
    const statusText = document.getElementById('toss-status-text');

    document.getElementById('toss-choices-container').classList.add('hidden');
    document.getElementById('toss-proceed-container').classList.add('hidden');

    if (window.cricketPvPRole === 'host') {
      if (flipBtn) flipBtn.classList.remove('hidden');
      if (statusText) statusText.innerText = 'Waiting to toss coin... Click FLIP COIN!';
      
      if (flipBtn) {
        flipBtn.onclick = () => {
          flipBtn.classList.add('hidden');
          const outcome = Math.random() < 0.5 ? 'heads' : 'tails';
          
          window.socket.emit('ps-game-message', {
            roomCode: window.roomCode,
            event: 'cricket-toss-flip',
            data: { outcome }
          });
          
          playTossAnimation(outcome);
        };
      }
    } else {
      if (flipBtn) flipBtn.classList.add('hidden');
      if (statusText) statusText.innerText = 'Player 1 is flipping the coin...';
    }
  }

  function playTossAnimation(outcome) {
    const statusText = document.getElementById('toss-status-text');
    if (statusText) statusText.innerText = 'Coin is in the air...';
    
    window.tossCoinState = 'flipping';
    window.tossCoinTimer = 0;
    
    setTimeout(() => {
      window.tossCoinState = 'paused';
      
      if (window.cricketPvPRole === 'guest') {
        if (statusText) statusText.innerText = 'Call Heads or Tails!';
        const choices = document.getElementById('toss-call-container');
        if (choices) choices.classList.remove('hidden');
        
        document.getElementById('toss-btn-heads').onclick = () => {
          choices.classList.add('hidden');
          submitTossCall('heads', outcome);
        };
        document.getElementById('toss-btn-tails').onclick = () => {
          choices.classList.add('hidden');
          submitTossCall('tails', outcome);
        };
      } else {
        if (statusText) statusText.innerText = 'Waiting for Player 2 to call heads/tails...';
      }
    }, 1500);
  }

  function submitTossCall(call, outcome) {
    window.socket.emit('ps-game-message', {
      roomCode: window.roomCode,
      event: 'cricket-toss-call',
      data: { call, outcome }
    });
    resolveTossResult(call, outcome);
  }

  function resolveTossResult(call, outcome) {
    window.tossCoinState = 'falling';
    window.tossCallValue = call;
    window.tossResult = outcome;

    const userWonToss = (call === outcome); 
    const guestWon = userWonToss; 
    const winnerRole = guestWon ? 'guest' : 'host';
    const statusText = document.getElementById('toss-status-text');

    setTimeout(() => {
      window.tossCoinState = 'idle';
      if (window.tossCoin3D) {
        window.tossCoin3D.rotation.set(outcome === 'heads' ? 0 : Math.PI, 0, 0);
      }

      if (window.cricketPvPRole === winnerRole) {
        if (statusText) statusText.innerText = `You won the toss! Choose to Bat or Bowl first.`;
        document.getElementById('toss-choices-container').classList.remove('hidden');
        
        document.getElementById('toss-btn-bat').onclick = () => {
          document.getElementById('toss-choices-container').classList.add('hidden');
          submitTossChoice('bat');
        };
        document.getElementById('toss-btn-bowl').onclick = () => {
          document.getElementById('toss-choices-container').classList.add('hidden');
          submitTossChoice('bowl');
        };
      } else {
        if (statusText) statusText.innerText = `Player ${winnerRole === 'host' ? '1' : '2'} won the toss and is choosing...`;
      }
    }, 1200);
  }

  function submitTossChoice(choice) {
    window.socket.emit('ps-game-message', {
      roomCode: window.roomCode,
      event: 'cricket-toss-choice',
      data: { choice, chooser: window.cricketPvPRole }
    });
    applyTossDecision(choice, window.cricketPvPRole);
  }

  function applyTossDecision(choice, chooser) {
    const statusText = document.getElementById('toss-status-text');
    let userIsBatting = false;

    if (chooser === window.cricketPvPRole) {
      userIsBatting = (choice === 'bat');
    } else {
      userIsBatting = (choice === 'bowl'); 
    }

    window.MATCH.userIsBatting = userIsBatting;
    window.MATCH.tossResultText = `${chooser === 'host' ? 'Player 1' : 'Player 2'} won the toss and elected to ${choice} first.`;
    
    if (statusText) {
      statusText.innerText = `${chooser === 'host' ? 'Player 1' : 'Player 2'} elected to ${choice.toUpperCase()} first.`;
    }

    document.getElementById('toss-proceed-container').classList.remove('hidden');
    document.getElementById('toss-btn-proceed').onclick = () => {
      document.getElementById('toss-screen').classList.add('hidden');
      window.tossCutsceneActive = false;
      if (typeof window.proceedFromMatchIntro === 'function') {
        window.proceedFromMatchIntro();
      }
    };
  }

  // ── Gameplay Ball Synchronization Hooks ─────────────────────────────────────
  const originalStartReleaseMeter = window.startReleaseMeter;
  window.startReleaseMeter = function() {
    originalStartReleaseMeter();
    if (window.matchMode === window.MODES.PVP) {
      window.socket.emit('ps-game-message', {
        roomCode: window.roomCode,
        event: 'cricket-bowl-aim',
        data: {
          targetX: window.MATCH.bowlingTargetX,
          targetZ: window.MATCH.bowlingTargetZ,
          deliveryType: window.deliveryType
        }
      });
    }
  };

  const originalBowlBall = window.bowlBall;
  window.bowlBall = function(steerAngle = 0, customType = '') {
    if (window.matchMode === window.MODES.PVP) {
      if (!window.MATCH.userIsBatting) {
        window.socket.emit('ps-game-message', {
          roomCode: window.roomCode,
          event: 'cricket-bowl-start',
          data: {
            targetX: window.MATCH.bowlingTargetX,
            targetZ: window.MATCH.bowlingTargetZ,
            deliveryType: window.deliveryType,
            score: window.MATCH.bowlerReleaseScore || 'perfect'
          }
        });
      }
    }
    originalBowlBall(steerAngle, customType);
  };

  const originalTriggerBatSwing = window.triggerBatSwing;
  window.triggerBatSwing = function() {
    if (window.matchMode === window.MODES.PVP && window.MATCH.userIsBatting) {
      window.socket.emit('ps-game-message', {
        roomCode: window.roomCode,
        event: 'cricket-swing',
        data: {
          aimX: window.controllerInput.aimX,
          aimY: window.controllerInput.aimY,
          time: Date.now()
        }
      });
    }
    originalTriggerBatSwing();
  };

  const originalCallRun = window.callRun;
  window.callRun = function() {
    if (window.matchMode === window.MODES.PVP && window.MATCH.userIsBatting) {
      window.socket.emit('ps-game-message', {
        roomCode: window.roomCode,
        event: 'cricket-run-call',
        data: { action: 'run' }
      });
    }
    originalCallRun();
  };

  const originalCancelRun = window.cancelRun;
  window.cancelRun = function() {
    if (window.matchMode === window.MODES.PVP && window.MATCH.userIsBatting) {
      window.socket.emit('ps-game-message', {
        roomCode: window.roomCode,
        event: 'cricket-run-call',
        data: { action: 'cancel' }
      });
    }
    originalCancelRun();
  };

  const originalProcessBallResult = window.processBallResult;
  window.processBallResult = function() {
    if (window.matchMode === window.MODES.PVP) {
      if (window.MATCH.userIsBatting) {
        window.socket.emit('ps-game-message', {
          roomCode: window.roomCode,
          event: 'cricket-ball-outcome',
          data: {
            runs: window.MATCH.runsThisBall,
            out: window.MATCH.isOutThisBall,
            outType: window.MATCH.outType,
            totalRuns: window.MATCH.totalRuns,
            wickets: window.MATCH.wickets,
            balls: window.MATCH.balls
          }
        });
      }
    }
    originalProcessBallResult();
  };

  // ── Sync Socket Receivers ──────────────────────────────────────────────────
  function bindPvPSocketListeners() {
    const socket = window.socket;
    if (!socket) return;

    socket.off('ps-game-message');

    socket.on('ps-game-message', ({ event, data }) => {
      console.log(`[PvP Sync] Received event: ${event}`, data);

      switch (event) {
        case 'cricket-select-team':
          if (data.role === 'host') {
            pvpSetupState.hostTeam = data.team;
          } else {
            pvpSetupState.guestTeam = data.team;
          }
          updatePvPLobbyUI();
          break;

        case 'cricket-select-conditions':
          pvpSetupState.stadium = data.stadium;
          pvpSetupState.overs = data.overs;
          pvpSetupState.hostSettingsConfirmed = true;
          updatePvPLobbyUI();
          break;

        case 'cricket-ready-lineup':
          if (data.role === 'host') {
            pvpSetupState.hostLineupReady = true;
          } else {
            pvpSetupState.guestLineupReady = true;
          }
          updatePvPLobbyUI();
          break;

        case 'cricket-start-match':
          document.getElementById('matchup-screen').classList.add('hidden');
          launchPVPGame();
          break;

        case 'cricket-toss-flip':
          playTossAnimation(data.outcome);
          break;

        case 'cricket-toss-call':
          resolveTossResult(data.call, data.outcome);
          break;

        case 'cricket-toss-choice':
          applyTossDecision(data.choice, data.chooser);
          break;

        case 'cricket-bowl-aim':
          window.MATCH.bowlingTargetX = data.targetX;
          window.MATCH.bowlingTargetZ = data.targetZ;
          window.deliveryType = data.deliveryType;
          if (window.landingMarker) {
            window.landingMarker.position.set(data.targetX, 0.052, data.targetZ);
            window.landingMarker.visible = true;
          }
          break;

        case 'cricket-bowl-start':
          window.MATCH.bowlingTargetX = data.targetX;
          window.MATCH.bowlingTargetZ = data.targetZ;
          window.deliveryType = data.deliveryType;
          window.MATCH.bowlerReleaseScore = data.score;
          originalBowlBall(0, data.deliveryType);
          break;

        case 'cricket-swing':
          window.controllerInput.aimX = data.aimX;
          window.controllerInput.aimY = data.aimY;
          originalTriggerBatSwing();
          break;

        case 'cricket-run-call':
          if (data.action === 'run') {
            originalCallRun();
          } else {
            originalCancelRun();
          }
          break;

        case 'cricket-ball-outcome':
          if (!window.MATCH.userIsBatting) {
            window.MATCH.runsThisBall = data.runs;
            window.MATCH.isOutThisBall = data.out;
            window.MATCH.outType = data.outType;
            window.MATCH.totalRuns = data.totalRuns;
            window.MATCH.wickets = data.wickets;
            window.MATCH.balls = data.balls;
            originalProcessBallResult();
          }
          break;
      }
    });
  }

})();
