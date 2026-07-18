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

  // ── DOM Setup Overlay Injection ─────────────────────────────────────────────
  function injectSetupOverlay() {
    if (document.getElementById('pvp-setup-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'pvp-setup-overlay';
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 999990;
      background: radial-gradient(circle at center, #0b1528 0%, #030712 100%);
      font-family: 'Outfit', 'Inter', sans-serif;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      color: #fff; padding: 20px; box-sizing: border-box;
    `;

    overlay.innerHTML = `
      <div style="max-width: 800px; width: 100%; text-align: center;">
        <!-- Header -->
        <div style="margin-bottom: 30px;">
          <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 3px; color: #60a5fa; font-weight: 800;">PLAYSPHERE ARENA</div>
          <div style="font-size: 2.2rem; font-weight: 900; letter-spacing: -0.5px; margin-top: 4px;">PVP MATCH LOBBY</div>
          <div style="font-size: 0.85rem; color: rgba(255,255,255,0.4); margin-top: 6px;">ROOM CODE: <span id="pvp-lobby-code" style="color: #fff; font-weight: 800; background: rgba(255,255,255,0.08); padding: 2px 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.15);">----</span></div>
        </div>

        <!-- Selection Panel Grid -->
        <div style="display: grid; grid-template-columns: 1fr 120px 1fr; gap: 24px; margin-bottom: 40px; align-items: center;">
          <!-- Host Panel -->
          <div id="pvp-panel-host" style="background: rgba(255,255,255,0.03); border: 1.5px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 24px; text-align: center;">
            <div style="font-size: 0.65rem; font-weight: 800; color: #60a5fa; letter-spacing: 2px; text-transform: uppercase;">PLAYER 1 (HOST)</div>
            <div id="pvp-host-team-name" style="font-size: 1.4rem; font-weight: 800; margin-top: 10px; color: rgba(255,255,255,0.3);">UNSELECTED</div>
            <div id="pvp-host-status" style="font-size: 0.75rem; color: rgba(255,255,255,0.4); margin-top: 14px; font-weight: 600;">Waiting for Selection...</div>
            <button id="pvp-btn-host-select" class="fc-action-btn" style="margin-top: 18px; width: 100%; display: none;">CHOOSE TEAM</button>
          </div>

          <!-- VS Middle -->
          <div style="text-align: center; font-size: 1.8rem; font-weight: 900; color: rgba(255,255,255,0.15); letter-spacing: 1px;">VS</div>

          <!-- Guest Panel -->
          <div id="pvp-panel-guest" style="background: rgba(255,255,255,0.03); border: 1.5px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 24px; text-align: center;">
            <div style="font-size: 0.65rem; font-weight: 800; color: #f87171; letter-spacing: 2px; text-transform: uppercase;">PLAYER 2 (GUEST)</div>
            <div id="pvp-guest-team-name" style="font-size: 1.4rem; font-weight: 800; margin-top: 10px; color: rgba(255,255,255,0.3);">UNSELECTED</div>
            <div id="pvp-guest-status" style="font-size: 0.75rem; color: rgba(255,255,255,0.4); margin-top: 14px; font-weight: 600;">Waiting for Turn...</div>
            <button id="pvp-btn-guest-select" class="fc-action-btn" style="margin-top: 18px; width: 100%; display: none;">CHOOSE TEAM</button>
          </div>
        </div>

        <!-- Stadium/Overs Panel (visible to Host or after confirm) -->
        <div id="pvp-settings-panel" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; padding: 20px; margin-bottom: 30px; display: none; text-align: left;">
          <div style="font-size: 0.78rem; font-weight: 800; color: #60a5fa; margin-bottom: 14px; text-transform: uppercase; letter-spacing: 1.5px;">MATCH CONFIGURATION</div>
          
          <div style="display: flex; gap: 20px;">
            <div style="flex: 1;">
              <label style="font-size: 0.72rem; color: rgba(255,255,255,0.4); font-weight: 700; margin-bottom: 6px; display: block;">STADIUM</label>
              <select id="pvp-lobby-stadium" class="settings-select" style="width: 100%;" disabled>
                <option value="default">Melbourne Cricket Ground</option>
                <option value="ekana">Ekana Stadium (Lucknow)</option>
                <option value="stadium_usdz">USDZ Stadium</option>
                <option value="qaddafi">Qaddafi Stadium (Lahore)</option>
                <option value="classic">Classic Cricket Stadium</option>
                <option value="grand">Grand Cricket Stadium</option>
                <option value="cricket_ground">Cricket Ground Arena</option>
              </select>
            </div>
            <div style="flex: 1;">
              <label style="font-size: 0.72rem; color: rgba(255,255,255,0.4); font-weight: 700; margin-bottom: 6px; display: block;">MATCH LENGTH</label>
              <select id="pvp-lobby-overs" class="settings-select" style="width: 100%;" disabled>
                <option value="1">1 Over</option>
                <option value="2" selected>2 Overs</option>
                <option value="5">5 Overs</option>
                <option value="10">10 Overs</option>
                <option value="20">20 Overs</option>
              </select>
            </div>
          </div>

          <button id="pvp-btn-settings-confirm" class="fc-action-btn primary" style="margin-top: 18px; width: 100%; display: none;">CONFIRM CONDITIONS</button>
        </div>

        <!-- Global Status Bar / Proceed Button -->
        <div>
          <div id="pvp-lobby-hint" style="font-size: 0.8rem; color: rgba(255,255,255,0.4); font-weight: 600;">Initializing connection...</div>
          <button id="pvp-btn-launch" class="fc-action-btn primary" style="display: none; margin-top: 16px; padding: 12px 40px;">START MATCH</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Bind selection button click listeners
    document.getElementById('pvp-btn-host-select').onclick = () => {
      if (typeof window.openTeamSelection === 'function') {
        window.openTeamSelection('home');
      }
    };
    document.getElementById('pvp-btn-guest-select').onclick = () => {
      if (typeof window.openTeamSelection === 'function') {
        window.openTeamSelection('away');
      }
    };
  }

  // ── Core PvP Initializer ────────────────────────────────────────────────────
  window.cricketPvPInit = function (matchData) {
    injectSetupOverlay();

    window.matchMode = window.MODES.PVP;
    window.roomCode = matchData.roomCode;
    window.cricketPvPRole = (window.socket.id === matchData.host.socketId) ? 'host' : 'guest';

    document.getElementById('pvp-lobby-code').innerText = matchData.roomCode;
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

    bindPvPSocketListeners();
    updatePvPLobbyUI();
  };

  // ── Sync UI State ──────────────────────────────────────────────────────────
  function updatePvPLobbyUI() {
    const isHost = (window.cricketPvPRole === 'host');
    const hTeamEl = document.getElementById('pvp-host-team-name');
    const gTeamEl = document.getElementById('pvp-guest-team-name');
    const hStatusEl = document.getElementById('pvp-host-status');
    const gStatusEl = document.getElementById('pvp-guest-status');
    const hintEl = document.getElementById('pvp-lobby-hint');
    const settingsPanel = document.getElementById('pvp-settings-panel');
    const stadiumSel = document.getElementById('pvp-lobby-stadium');
    const oversSel = document.getElementById('pvp-lobby-overs');
    const confirmSettingsBtn = document.getElementById('pvp-btn-settings-confirm');
    const launchBtn = document.getElementById('pvp-btn-launch');

    const selectHostBtn = document.getElementById('pvp-btn-host-select');
    const selectGuestBtn = document.getElementById('pvp-btn-guest-select');

    // Update teams names
    if (pvpSetupState.hostTeam) {
      hTeamEl.innerText = window.TEAMS[pvpSetupState.hostTeam]?.name.toUpperCase() || pvpSetupState.hostTeam;
      hTeamEl.style.color = '#fff';
    } else {
      hTeamEl.innerText = "SELECTING...";
      hTeamEl.style.color = 'rgba(255,255,255,0.25)';
    }

    if (pvpSetupState.guestTeam) {
      gTeamEl.innerText = window.TEAMS[pvpSetupState.guestTeam]?.name.toUpperCase() || pvpSetupState.guestTeam;
      gTeamEl.style.color = '#fff';
    } else {
      gTeamEl.innerText = "SELECTING...";
      gTeamEl.style.color = 'rgba(255,255,255,0.25)';
    }

    // Step 1: Team Select Phase
    if (pvpSetupState.step === 'team_select') {
      if (!pvpSetupState.hostTeam) {
        hStatusEl.innerText = "Choosing Team...";
        gStatusEl.innerText = "Waiting for Host...";
        hintEl.innerText = isHost ? "Your turn: select home team." : "Waiting for Host to choose team.";
        
        selectHostBtn.style.display = isHost ? 'block' : 'none';
        selectGuestBtn.style.display = 'none';
      } else if (!pvpSetupState.guestTeam) {
        hStatusEl.innerText = "Team Chosen (Ready)";
        gStatusEl.innerText = "Choosing Team...";
        hintEl.innerText = isHost ? "Waiting for Guest to choose team." : "Your turn: select away team.";

        selectHostBtn.style.display = 'none';
        selectGuestBtn.style.display = (!isHost) ? 'block' : 'none';
      } else {
        pvpSetupState.step = 'stadium_select';
        updatePvPLobbyUI();
      }
    }

    // Step 2: Settings Config Phase
    else if (pvpSetupState.step === 'stadium_select') {
      hStatusEl.innerText = "Team Ready";
      gStatusEl.innerText = "Team Ready";
      selectHostBtn.style.display = 'none';
      selectGuestBtn.style.display = 'none';
      settingsPanel.style.display = 'block';

      if (!pvpSetupState.hostSettingsConfirmed) {
        hintEl.innerText = isHost ? "Host: configure Stadium & Overs length." : "Waiting for Host to configure match length.";
        stadiumSel.disabled = !isHost;
        oversSel.disabled = !isHost;
        confirmSettingsBtn.style.display = isHost ? 'block' : 'none';
      } else {
        stadiumSel.disabled = true;
        oversSel.disabled = true;
        confirmSettingsBtn.style.display = 'none';

        stadiumSel.value = pvpSetupState.stadium;
        oversSel.value = String(pvpSetupState.overs);

        if (!pvpSetupState.guestConfirmed) {
          hintEl.innerText = isHost ? "Waiting for Guest to confirm and start match." : "Review stadium and click START MATCH.";
          launchBtn.style.display = isHost ? 'none' : 'block';
        } else {
          // Both ready! Close overlay and boot toss
          document.getElementById('pvp-setup-overlay').remove();
          launchPVPGame();
        }
      }
    }
  }

  // ── Override Team Selector to sync choice ──────────────────────────────────
  const originalSelectTeam = window.selectTeam;
  window.selectTeam = function (teamKey) {
    if (window.matchMode !== window.MODES.PVP) {
      originalSelectTeam(teamKey);
      return;
    }

    // Save locally
    if (window.cricketPvPRole === 'host') {
      pvpSetupState.hostTeam = teamKey;
      window.MATCH.userTeam = teamKey;
      // Sync lineup
      const team = window.TEAMS[teamKey];
      if (team && team.lineup) {
        window.MATCH.batters[0].name = team.lineup[0];
        window.MATCH.batters[1].name = team.lineup[1];
      }
    } else {
      pvpSetupState.guestTeam = teamKey;
      window.MATCH.oppTeam = teamKey;
      const team = window.TEAMS[teamKey];
      if (team) {
        window.MATCH.bowlerName = team.bowler || team.lineup[8];
      }
    }

    // Close selector
    window.closeTeamSelection();

    // Broadcast select-team event
    window.socket.emit('ps-game-message', {
      roomCode: window.roomCode,
      event: 'cricket-select-team',
      data: {
        role: window.cricketPvPRole,
        team: teamKey
      }
    });

    updatePvPLobbyUI();
  };

  // Bind settings confirm buttons
  document.addEventListener('DOMContentLoaded', () => {
    const confirmBtn = document.getElementById('pvp-btn-settings-confirm');
    if (confirmBtn) {
      confirmBtn.onclick = () => {
        const stadium = document.getElementById('pvp-lobby-stadium').value;
        const overs = parseInt(document.getElementById('pvp-lobby-overs').value);

        pvpSetupState.stadium = stadium;
        pvpSetupState.overs = overs;
        pvpSetupState.hostSettingsConfirmed = true;

        window.socket.emit('ps-game-message', {
          roomCode: window.roomCode,
          event: 'cricket-select-conditions',
          data: { stadium, overs }
        });

        updatePvPLobbyUI();
      };
    }

    const launchBtn = document.getElementById('pvp-btn-launch');
    if (launchBtn) {
      launchBtn.onclick = () => {
        pvpSetupState.guestConfirmed = true;
        window.socket.emit('ps-game-message', {
          roomCode: window.roomCode,
          event: 'cricket-ready-play',
          data: {}
        });
        updatePvPLobbyUI();
      };
    }
  });

  // ── Launch Game ─────────────────────────────────────────────────────────────
  function launchPVPGame() {
    // Configure match globals
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
        // Force state to Splash (which now calls the start of coin toss)
        setGameState(window.STATES.BOWL_READY); // Skip normal intro and open toss
        startPvPToss();
      });
    }
  }

  // ── Real-time Coin Toss Sync ────────────────────────────────────────────────
  function startPvPToss() {
    // Show toss screen, hide choices from Guest initially, allow host to flip
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
          // Pick a random winner and outcome
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
    
    // Simulate 3D coin rotation
    window.tossCoinState = 'flipping';
    window.tossCoinTimer = 0;
    
    setTimeout(() => {
      // Pause mid-air for calls
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

    const userWonToss = (call === outcome); // Guest won if call matches outcome
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
      userIsBatting = (choice === 'bowl'); // Opposite
    }

    window.MATCH.userIsBatting = userIsBatting;
    window.MATCH.tossResultText = `${chooser === 'host' ? 'Player 1' : 'Player 2'} won the toss and elected to ${choice} first.`;
    
    if (statusText) {
      statusText.innerText = `${chooser === 'host' ? 'Player 1' : 'Player 2'} elected to ${choice.toUpperCase()} first.`;
    }

    document.getElementById('toss-proceed-container').classList.remove('hidden');
    document.getElementById('toss-btn-proceed').onclick = () => {
      document.getElementById('toss-screen').classList.add('hidden');
      
      // Start the match preview intro cutscene
      window.tossCutsceneActive = false;
      if (typeof window.proceedFromMatchIntro === 'function') {
        window.proceedFromMatchIntro();
      }
    };
  }

  // ── Gameplay Ball Synchronization Hooks ─────────────────────────────────────
  
  // 1. Bowler Aim & Release Synchronization
  const originalStartReleaseMeter = window.startReleaseMeter;
  window.startReleaseMeter = function() {
    originalStartReleaseMeter();
    
    if (window.matchMode === window.MODES.PVP) {
      // Bowler locks aim location — emit aim target
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

  // Hook bowlBall to broadcast delivery attributes
  const originalBowlBall = window.bowlBall;
  window.bowlBall = function(steerAngle = 0, customType = '') {
    if (window.matchMode === window.MODES.PVP) {
      // Only the bowler client calls the original bowlBall directly from user input
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

  // 2. Batter Swing Timing Sync
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

  // 3. Batter Run Sync
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

  // 4. Ball Outcome Sync (triggered at the end of each ball delivery)
  const originalProcessBallResult = window.processBallResult;
  window.processBallResult = function() {
    if (window.matchMode === window.MODES.PVP) {
      // The batter is the physics host for hitting — batter sends authoritative result
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

    // Clear old pvp message listeners
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

        case 'cricket-ready-play':
          pvpSetupState.guestConfirmed = true;
          updatePvPLobbyUI();
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

        // Bowl Sync (received by batter)
        case 'cricket-bowl-aim':
          window.MATCH.bowlingTargetX = data.targetX;
          window.MATCH.bowlingTargetZ = data.targetZ;
          window.deliveryType = data.deliveryType;
          if (window.landingMarker) {
            window.landingMarker.position.set(data.targetX, 0.052, data.targetZ);
            window.landingMarker.visible = true; // Batter gets aim preview briefly
          }
          break;

        case 'cricket-bowl-start':
          window.MATCH.bowlingTargetX = data.targetX;
          window.MATCH.bowlingTargetZ = data.targetZ;
          window.deliveryType = data.deliveryType;
          window.MATCH.bowlerReleaseScore = data.score;
          // Trigger the delivery on the batter's screen
          originalBowlBall(0, data.deliveryType);
          break;

        // Swing Sync (received by bowler)
        case 'cricket-swing':
          window.controllerInput.aimX = data.aimX;
          window.controllerInput.aimY = data.aimY;
          originalTriggerBatSwing();
          break;

        // Run Sync
        case 'cricket-run-call':
          if (data.action === 'run') {
            originalCallRun();
          } else {
            originalCancelRun();
          }
          break;

        // authorative outcome sync
        case 'cricket-ball-outcome':
          if (!window.MATCH.userIsBatting) {
            // Apply batter outcome to keep scores identical
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
