/**
 * WWE Chibi Rumble — Real-time Online PvP Sync Module
 */
(function () {
  'use strict';

  const params = new URLSearchParams(window.location.search);
  const roomCode = params.get('room') || (sessionStorage.getItem('ps_active_match') ? JSON.parse(sessionStorage.getItem('ps_active_match')).roomCode : null);

  if (!roomCode) return;

  console.log(`[WWE PvP] Intercepting startup for Room: ${roomCode}`);

  window.gameMode = 'PVP';
  window.cricketPvPRole = (sessionStorage.getItem('ps_match_role') === 'host' || window.location.hash === '#host') ? 'host' : 'guest';

  // Wait for game state and socket to initialize
  const pollTimer = setInterval(() => {
    if (window.socket && window.STATES) {
      clearInterval(pollTimer);
      initWWEPvP();
    }
  }, 100);

  function initWWEPvP() {
    console.log("[WWE PvP] Initializing network sync layer...");

    // Join the socket room
    window.socket.emit('ps-game-join', {
      roomCode: roomCode,
      game: 'wwe',
      isHost: window.cricketPvPRole === 'host'
    });

    // Bypass controller QR screen
    window.controllerSlots.PLAYER_1.connected = true;
    window.controllerSlots.PLAYER_2.connected = true;

    // Direct transition to character selection screen
    setTimeout(() => {
      window.gameState = window.STATES.CHAR_SELECT;
      const lobby = document.getElementById('lobby-screen');
      if (lobby) lobby.classList.add('hidden');
      const charSelect = document.getElementById('char-select-screen');
      if (charSelect) charSelect.classList.remove('hidden');
    }, 800);

    bindWWEEvents();
  }

  function bindWWEEvents() {
    const socket = window.socket;
    const isHost = (window.cricketPvPRole === 'host');
    const mySlot = isHost ? 'PLAYER_1' : 'PLAYER_2';

    socket.on('ps-game-message', ({ event, data }) => {
      switch (event) {
        case 'wwe-input':
          // Update the other player's input state locally
          if (data.slot !== mySlot) {
            Object.assign(window.playerInputs[data.slot], data.input);
          }
          break;

        case 'wwe-pos-sync':
          // Snap coordinates to prevent physics/position drifting
          if (window.fighters) {
            if (window.fighters.PLAYER_1) {
              window.fighters.PLAYER_1.x = data.p1.x;
              window.fighters.PLAYER_1.y = data.p1.y;
              window.fighters.PLAYER_1.hp = data.p1.hp;
            }
            if (window.fighters.PLAYER_2) {
              window.fighters.PLAYER_2.x = data.p2.x;
              window.fighters.PLAYER_2.y = data.p2.y;
              window.fighters.PLAYER_2.hp = data.p2.hp;
            }
          }
          break;

        case 'wwe-char-select':
          if (data.role === 'host') {
            window.p1SelectedChar = data.char;
          } else {
            window.p2SelectedChar = data.char;
          }
          updateCharSelectUI();
          break;

        case 'wwe-char-ready':
          if (data.role === 'host') {
            window.controllerSlots.PLAYER_1.ready = data.ready;
          } else {
            window.controllerSlots.PLAYER_2.ready = data.ready;
          }
          checkStartBattle();
          break;
      }
    });

    // Intercept keyboard controls to broadcast inputs to opponent
    window.addEventListener('keydown', () => {
      broadcastMyInput(mySlot);
    });
    window.addEventListener('keyup', () => {
      broadcastMyInput(mySlot);
    });

    // Host periodically syncs positions as the authority
    setInterval(() => {
      if (window.gameState === window.STATES.BATTLE && isHost && window.fighters) {
        socket.emit('ps-game-message', {
          roomCode: roomCode,
          event: 'wwe-pos-sync',
          data: {
            p1: { x: window.fighters.PLAYER_1.x, y: window.fighters.PLAYER_1.y, hp: window.fighters.PLAYER_1.hp },
            p2: { x: window.fighters.PLAYER_2.x, y: window.fighters.PLAYER_2.y, hp: window.fighters.PLAYER_2.hp }
          }
        });
      }
    }, 150);

    // Sync character ready button clicks
    setupWWEConfigSync();
  }

  function broadcastMyInput(mySlot) {
    const input = window.playerInputs[mySlot];
    if (input && window.socket) {
      window.socket.emit('ps-game-message', {
        roomCode: roomCode,
        event: 'wwe-input',
        data: { slot: mySlot, input }
      });
    }
  }

  function updateCharSelectUI() {
    // Renders selected badges on roster slots
    document.querySelectorAll('.roster-grid .char-card').forEach(card => {
      const charKey = card.getAttribute('data-char');
      card.querySelectorAll('.player-badge').forEach(b => b.remove());

      if (charKey === window.p1SelectedChar) {
        const badge = document.createElement('div');
        badge.className = 'player-badge p1';
        badge.innerText = 'P1';
        card.appendChild(badge);
      }
      if (charKey === window.p2SelectedChar) {
        const badge = document.createElement('div');
        badge.className = 'player-badge p2';
        badge.innerText = 'P2';
        card.appendChild(badge);
      }
    });
  }

  function setupWWEConfigSync() {
    // Intercept character selector clicks
    document.querySelectorAll('.roster-grid .char-card').forEach(card => {
      const originalClick = card.onclick;
      card.onclick = () => {
        const charKey = card.getAttribute('data-char');
        if (window.cricketPvPRole === 'host') {
          window.p1SelectedChar = charKey;
        } else {
          window.p2SelectedChar = charKey;
        }
        updateCharSelectUI();

        window.socket.emit('ps-game-message', {
          roomCode: roomCode,
          event: 'wwe-char-select',
          data: { role: window.cricketPvPRole, char: charKey }
        });
      };
    });

    // Character Confirm / Ready button sync
    const originalReadyBtn = document.getElementById('btn-confirm-char');
    if (originalReadyBtn) {
      originalReadyBtn.onclick = () => {
        const mySlot = (window.cricketPvPRole === 'host') ? 'PLAYER_1' : 'PLAYER_2';
        const nextReady = !window.controllerSlots[mySlot].ready;
        window.controllerSlots[mySlot].ready = nextReady;

        window.socket.emit('ps-game-message', {
          roomCode: roomCode,
          event: 'wwe-char-ready',
          data: { role: window.cricketPvPRole, ready: nextReady }
        });

        checkStartBattle();
      };
    }
  }

  function checkStartBattle() {
    const p1R = window.controllerSlots.PLAYER_1.ready ? 1 : 0;
    const p2R = window.controllerSlots.PLAYER_2.ready ? 1 : 0;
    const btn = document.getElementById('btn-confirm-char');
    if (btn) btn.innerText = `CONFIRM (${p1R + p2R}/2 READY)`;

    if (window.controllerSlots.PLAYER_1.ready && window.controllerSlots.PLAYER_2.ready) {
      // Transition to Countdown and Battle
      window.gameState = window.STATES.COUNTDOWN;
      const charScreen = document.getElementById('char-select-screen');
      if (charScreen) charScreen.classList.add('hidden');
      const countScreen = document.getElementById('countdown-screen');
      if (countScreen) countScreen.classList.remove('hidden');
      
      if (typeof window.startCountdownSequence === 'function') {
        window.startCountdownSequence();
      }
    }
  }

})();
