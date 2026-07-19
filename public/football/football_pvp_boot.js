/**
 * Football Pro 2026 — Turn-Based Online PvP Setup Controller
 * Drives native Select Teams & Match Preview screens turn-wise.
 */
(function () {
  'use strict';

  const params = new URLSearchParams(window.location.search);
  const roomCode = params.get('room');

  if (!roomCode) return;

  console.log(`[Football PvP Boot] Intercepting match startup for Room: ${roomCode}`);

  let mySlot = null;
  let isHost = false;
  let pvpSetupState = {
    step: 'host_select', // 'host_select', 'guest_select', 'preview', 'ready_to_play'
    hostTeamCountry: 'Spain',
    hostTeamIdx: 0,
    guestTeamCountry: 'Spain',
    guestTeamIdx: 1,
    hostConfirmed: false,
    guestConfirmed: false
  };

  // Wait for SocketController and game UI to load
  const pollTimer = setInterval(() => {
    const socket = window.SocketController && window.SocketController.socket;
    const matchupScreen = document.getElementById('menu-matchup-view');

    if (socket && socket.connected && matchupScreen && window.updateTeamSelectUI) {
      clearInterval(pollTimer);
      startSetup();
    }
  }, 100);

  function startSetup() {
    const socket = window.SocketController.socket;

    // Join room on the gameplay socket
    socket.emit('pvp-join-room', { roomCode });

    socket.on('pvp-room-joined', (data) => {
      const me = data.players.find(p => p.socketId === socket.id);
      if (me) {
        mySlot = me.slot;
        isHost = (mySlot === 1);
        console.log(`[Football PvP] Joined room. Slot: ${mySlot}, isHost: ${isHost}`);
        initPvPSetupUI();
      }
    });

    socket.on('pvp-room-updated', (data) => {
      const me = data.players.find(p => p.socketId === socket.id);
      if (me && mySlot === null) {
        mySlot = me.slot;
        isHost = (mySlot === 1);
        initPvPSetupUI();
      }
    });
  }

  function initPvPSetupUI() {
    // Hide main menu and subscreen views, show team select matchup view
    const mainScreen = document.getElementById('main-menu-screen');
    const subScreen = document.getElementById('subscreen-view');
    const matchupScreen = document.getElementById('menu-matchup-view');

    if (mainScreen) mainScreen.style.display = 'none';
    if (subScreen) subScreen.style.display = 'none';
    if (matchupScreen) matchupScreen.style.display = 'flex';

    // Remove Back Button on matchup screen to prevent exit
    const backBtn = document.getElementById('btn-back-to-dash');
    if (backBtn) backBtn.style.display = 'none';

    // Create a status hint banner on screen
    let statusHint = document.getElementById('pvp-status-hint');
    if (!statusHint) {
      statusHint = document.createElement('div');
      statusHint.id = 'pvp-status-hint';
      statusHint.style.cssText = "position: absolute; top: 12px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.85); border: 1.5px solid #a3e635; color: #fff; padding: 10px 24px; border-radius: 8px; font-family: 'Orbitron', sans-serif; font-size: 0.9rem; font-weight: 800; z-index: 9999; pointer-events: none; letter-spacing: 1px; box-shadow: 0 0 15px rgba(163,230,53,0.3);";
      matchupScreen.appendChild(statusHint);
    }

    // Change CONFIRM TEAMS button to CONFIRM MY TEAM
    const confirmBtn = document.getElementById('btn-confirm-teams');
    if (confirmBtn) {
      confirmBtn.innerText = "CONFIRM MY TEAM ✔";
    }

    // Listen to parent socket game messages
    const parentSocket = window.parent.socket || window.socket;
    if (parentSocket) {
      // Clean up previous listeners
      parentSocket.off('ps-game-message');
      
      parentSocket.on('ps-game-message', ({ event, data }) => {
        if (event === 'football-setup') {
          pvpSetupState = data;
          applySetupState();
        } else if (event === 'football-start-match') {
          launchPVPGameplay();
        }
      });
    }

    // Hijack native selectors
    hijackTeamSelectionControls();
    applySetupState();
  }

  function hijackTeamSelectionControls() {
    const userSelect = window.userCountrySelect;
    const oppSelect = window.oppCountrySelect;

    // Hijack home selectors (home changes are only allowed for Host/P1)
    if (userSelect) {
      userSelect.onchange = () => {
        if (isHost && pvpSetupState.step === 'host_select') {
          window.gameState.homeTeam.clubIndex = 0;
          window.gameState.selectedHomeLineup = null;
          window.gameState.selectedHomeReserves = null;
          window.updateTeamSelectUI();
          syncSelection();
        }
      };
    }

    document.getElementById('user-team-prev').onclick = () => {
      if (isHost && pvpSetupState.step === 'host_select') {
        const country = userSelect.value;
        const count = window.CLUBS_DATABASE[country].length;
        window.gameState.homeTeam.clubIndex = (window.gameState.homeTeam.clubIndex - 1 + count) % count;
        window.gameState.selectedHomeLineup = null;
        window.gameState.selectedHomeReserves = null;
        window.updateTeamSelectUI();
        syncSelection();
      }
    };

    document.getElementById('user-team-next').onclick = () => {
      if (isHost && pvpSetupState.step === 'host_select') {
        const country = userSelect.value;
        const count = window.CLUBS_DATABASE[country].length;
        window.gameState.homeTeam.clubIndex = (window.gameState.homeTeam.clubIndex + 1) % count;
        window.gameState.selectedHomeLineup = null;
        window.gameState.selectedHomeReserves = null;
        window.updateTeamSelectUI();
        syncSelection();
      }
    };

    // Hijack away selectors (away changes are only allowed for Guest/P2)
    if (oppSelect) {
      oppSelect.onchange = () => {
        if (!isHost && pvpSetupState.step === 'guest_select') {
          window.gameState.awayTeam.clubIndex = 0;
          window.gameState.selectedAwayLineup = null;
          window.gameState.selectedAwayReserves = null;
          window.updateTeamSelectUI();
          syncSelection();
        }
      };
    }

    document.getElementById('opp-team-prev').onclick = () => {
      if (!isHost && pvpSetupState.step === 'guest_select') {
        const country = oppSelect.value;
        const count = window.CLUBS_DATABASE[country].length;
        window.gameState.awayTeam.clubIndex = (window.gameState.awayTeam.clubIndex - 1 + count) % count;
        window.gameState.selectedAwayLineup = null;
        window.gameState.selectedAwayReserves = null;
        window.updateTeamSelectUI();
        syncSelection();
      }
    };

    document.getElementById('opp-team-next').onclick = () => {
      if (!isHost && pvpSetupState.step === 'guest_select') {
        const country = oppSelect.value;
        const count = window.CLUBS_DATABASE[country].length;
        window.gameState.awayTeam.clubIndex = (window.gameState.awayTeam.clubIndex + 1) % count;
        window.gameState.selectedAwayLineup = null;
        window.gameState.selectedAwayReserves = null;
        window.updateTeamSelectUI();
        syncSelection();
      }
    };

    // Hijack confirm teams button
    const confirmBtn = document.getElementById('btn-confirm-teams');
    if (confirmBtn) {
      confirmBtn.onclick = () => {
        if (isHost && pvpSetupState.step === 'host_select') {
          pvpSetupState.hostConfirmed = true;
          pvpSetupState.step = 'guest_select';
          pvpSetupState.hostTeamCountry = userSelect.value;
          pvpSetupState.hostTeamIdx = window.gameState.homeTeam.clubIndex;
          sendSetupState();
          applySetupState();
        } else if (!isHost && pvpSetupState.step === 'guest_select') {
          pvpSetupState.guestConfirmed = true;
          pvpSetupState.step = 'preview';
          pvpSetupState.guestTeamCountry = oppSelect.value;
          pvpSetupState.guestTeamIdx = window.gameState.awayTeam.clubIndex;
          sendSetupState();
          applySetupState();
        }
      };
    }
  }

  function syncSelection() {
    if (isHost) {
      pvpSetupState.hostTeamCountry = window.userCountrySelect.value;
      pvpSetupState.hostTeamIdx = window.gameState.homeTeam.clubIndex;
    } else {
      pvpSetupState.guestTeamCountry = window.oppCountrySelect.value;
      pvpSetupState.guestTeamIdx = window.gameState.awayTeam.clubIndex;
    }
    sendSetupState();
  }

  function sendSetupState() {
    const parentSocket = window.parent.socket || window.socket;
    if (parentSocket) {
      parentSocket.emit('ps-game-message', {
        roomCode,
        event: 'football-setup',
        data: pvpSetupState
      });
    }
  }

  function applySetupState() {
    // 1. Update dropdowns and indices programmatically
    if (window.userCountrySelect && window.oppCountrySelect) {
      if (window.userCountrySelect.value !== pvpSetupState.hostTeamCountry) {
        window.userCountrySelect.value = pvpSetupState.hostTeamCountry;
      }
      window.gameState.homeTeam.clubIndex = pvpSetupState.hostTeamIdx;

      if (window.oppCountrySelect.value !== pvpSetupState.guestTeamCountry) {
        window.oppCountrySelect.value = pvpSetupState.guestTeamCountry;
      }
      window.gameState.awayTeam.clubIndex = pvpSetupState.guestTeamIdx;

      window.updateTeamSelectUI();
    }

    // 2. Manage DOM disabled states based on current step and role
    const userSelect = window.userCountrySelect;
    const oppSelect = window.oppCountrySelect;
    const hostPrev = document.getElementById('user-team-prev');
    const hostNext = document.getElementById('user-team-next');
    const guestPrev = document.getElementById('opp-team-prev');
    const guestNext = document.getElementById('opp-team-next');
    const confirmBtn = document.getElementById('btn-confirm-teams');
    const statusHint = document.getElementById('pvp-status-hint');

    // Reset controls
    if (userSelect) userSelect.disabled = true;
    if (oppSelect) oppSelect.disabled = true;
    if (hostPrev) hostPrev.style.pointerEvents = 'none';
    if (hostNext) hostNext.style.pointerEvents = 'none';
    if (guestPrev) guestPrev.style.pointerEvents = 'none';
    if (guestNext) guestNext.style.pointerEvents = 'none';
    if (confirmBtn) confirmBtn.style.display = 'none';

    if (pvpSetupState.step === 'host_select') {
      if (statusHint) statusHint.innerText = isHost ? "CHOOSE YOUR TEAM AND CLICK CONFIRM" : "WAITING FOR P1 TO CHOOSE TEAM...";
      if (isHost) {
        if (userSelect) userSelect.disabled = false;
        if (hostPrev) hostPrev.style.pointerEvents = 'auto';
        if (hostNext) hostNext.style.pointerEvents = 'auto';
        if (confirmBtn) confirmBtn.style.display = 'block';
      }
    } else if (pvpSetupState.step === 'guest_select') {
      if (statusHint) statusHint.innerText = !isHost ? "CHOOSE YOUR TEAM AND CLICK CONFIRM" : "WAITING FOR P2 TO CHOOSE TEAM...";
      if (!isHost) {
        if (oppSelect) oppSelect.disabled = false;
        if (guestPrev) guestPrev.style.pointerEvents = 'auto';
        if (guestNext) guestNext.style.pointerEvents = 'auto';
        if (confirmBtn) confirmBtn.style.display = 'block';
      }
    } else if (pvpSetupState.step === 'preview') {
      if (statusHint) statusHint.remove();

      // Trigger the native transition to match preview screen!
      const matchupView = document.getElementById('menu-matchup-view');
      const previewView = document.getElementById('match-preview-screen');
      if (matchupView && previewView && matchupView.style.display !== 'none') {
        matchupView.style.display = 'none';
        previewView.style.display = 'flex';

        // Populate preview details
        const hClubs = window.CLUBS_DATABASE[pvpSetupState.hostTeamCountry] || [];
        const hClub = hClubs[pvpSetupState.hostTeamIdx] || hClubs[0];
        const aClubs = window.CLUBS_DATABASE[pvpSetupState.guestTeamCountry] || [];
        const aClub = aClubs[pvpSetupState.guestTeamIdx] || aClubs[0];

        if (hClub && aClub) {
          document.getElementById('preview-home-crest').innerText = hClub.crest;
          document.getElementById('preview-home-name').innerText = hClub.name;
          document.getElementById('preview-away-crest').innerText = aClub.crest;
          document.getElementById('preview-away-name').innerText = aClub.name;
        }
      }

      // Hijack the match preview screen buttons
      setupMatchPreviewPVP();
    }
  }

  function setupMatchPreviewPVP() {
    const startBtn = document.getElementById('menu-start-btn');
    const backBtn = document.getElementById('btn-back-to-teams');

    if (backBtn) backBtn.style.display = 'none'; // Lock them in this match preview

    if (startBtn) {
      if (isHost) {
        startBtn.innerText = "⚡ START PVP MATCH";
        startBtn.disabled = false;
        startBtn.style.background = '#a3e635';
        startBtn.style.color = '#000';
        startBtn.style.cursor = 'pointer';
        startBtn.onclick = () => {
          const parentSocket = window.parent.socket || window.socket;
          if (parentSocket) {
            parentSocket.emit('ps-game-message', {
              roomCode,
              event: 'football-start-match',
              data: {}
            });
          }
          launchPVPGameplay();
        };
      } else {
        startBtn.innerText = "WAITING FOR HOST TO START...";
        startBtn.disabled = true;
        startBtn.style.boxShadow = 'none';
        startBtn.style.background = '#6b7280';
        startBtn.style.color = '#fff';
        startBtn.style.cursor = 'not-allowed';
      }
    }
  }

  function launchPVPGameplay() {
    // Hide matchup and preview screens
    const overlays = [
      'main-menu-screen',
      'match-preview-screen',
      'menu-matchup-view',
      'menu-dashboard-view',
      'team-management-screen',
      'subscreen-view'
    ];
    overlays.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });

    console.log(`[Football PvP] Starting pvpready socket state for role slot: ${mySlot}`);
    
    // Set the team names in Football socket room state before sending ready
    const hClubs = window.CLUBS_DATABASE[pvpSetupState.hostTeamCountry] || [];
    const hClub = hClubs[pvpSetupState.hostTeamIdx] || hClubs[0];
    const aClubs = window.CLUBS_DATABASE[pvpSetupState.guestTeamCountry] || [];
    const aClub = aClubs[pvpSetupState.guestTeamIdx] || aClubs[0];

    window.SocketController.socket.emit('pvp-select-team', { teamName: isHost ? hClub.name : aClub.name });
    
    // Wait slightly to ensure team selection is saved on server, then send ready
    setTimeout(() => {
      window.SocketController.socket.emit('pvp-ready', { ready: true });
    }, 150);
  }
})();
