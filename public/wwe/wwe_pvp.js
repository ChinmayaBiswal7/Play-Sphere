/**
 * WWE Chibi Rumble — Real-time Online PvP Sync Module
 * Reuses the native character selection screen and locks/readies selections turn-wise.
 */
(function () {
  'use strict';

  const params = new URLSearchParams(window.location.search);
  const roomCode = params.get('room');

  if (!roomCode) return;

  console.log(`[WWE PvP] Intercepting startup for Room: ${roomCode}`);

  window.gameMode = 'PVP';
  window.cricketPvPRole = (sessionStorage.getItem('ps_match_role') === 'host' || window.location.hash === '#host') ? 'host' : 'guest';

  // Wait for game state and socket to initialize
  const pollTimer = setInterval(() => {
    if (window.socket && window.STATES && window.lockWrestlersAndStartMatch) {
      clearInterval(pollTimer);
      initWWEPvP();
    }
  }, 100);

  let originalLockAndStart = null;

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
      updateReadyIndicatorUI();
    }, 800);

    // Hijack lockWrestlersAndStartMatch for turn-ready
    originalLockAndStart = window.lockWrestlersAndStartMatch;
    window.lockWrestlersAndStartMatch = function () {
      const mySlot = (window.cricketPvPRole === 'host') ? 'PLAYER_1' : 'PLAYER_2';
      const nextReady = !window.controllerSlots[mySlot].ready;
      window.controllerSlots[mySlot].ready = nextReady;

      window.socket.emit('ps-game-message', {
        roomCode: roomCode,
        event: 'wwe-char-ready',
        data: { role: window.cricketPvPRole, ready: nextReady }
      });

      updateReadyIndicatorUI();
      checkStartBattle();
    };

    bindWWEEvents();
  }

  function bindWWEEvents() {
    const socket = window.socket;
    const isHost = (window.cricketPvPRole === 'host');
    const mySlot = isHost ? 'PLAYER_1' : 'PLAYER_2';

    socket.on('ps-game-message', ({ event, data }) => {
      switch (event) {
        case 'wwe-input':
          if (data.slot !== mySlot) {
            Object.assign(window.playerInputs[data.slot], data.input);
          }
          break;

        case 'wwe-pos-sync':
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
          updateReadyIndicatorUI();
          break;

        case 'wwe-char-ready':
          if (data.role === 'host') {
            window.controllerSlots.PLAYER_1.ready = data.ready;
          } else {
            window.controllerSlots.PLAYER_2.ready = data.ready;
          }
          updateReadyIndicatorUI();
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

    // Host periodically syncs positions
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

    setupWWERosterSync();
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
    document.querySelectorAll('.roster-grid .wrestler-card').forEach(card => {
      const charKey = card.getAttribute('data-char');
      card.classList.remove('active');

      if (charKey === window.p1SelectedChar) {
        card.classList.add('active');
      }
      if (charKey === window.p2SelectedChar) {
        card.classList.add('active');
      }
    });
  }

  function updateReadyIndicatorUI() {
    const p1Ready = window.controllerSlots.PLAYER_1.ready;
    const p2Ready = window.controllerSlots.PLAYER_2.ready;

    const p1Badge = document.getElementById('p1-select-badge');
    const p2Badge = document.getElementById('p2-select-badge');

    if (p1Badge) {
      const charName = window.ROSTER[window.p1SelectedChar]?.name || 'CODY RHODES';
      p1Badge.innerText = `P1: ${charName} ${p1Ready ? '(READY ✓)' : '(CHOOSING...)'}`;
    }
    if (p2Badge) {
      const charName = window.ROSTER[window.p2SelectedChar]?.name || 'ROMAN REIGNS';
      p2Badge.innerText = `P2: ${charName} ${p2Ready ? '(READY ✓)' : '(CHOOSING...)'}`;
    }
  }

  function setupWWERosterSync() {
    document.querySelectorAll('.roster-grid .wrestler-card').forEach(card => {
      card.onclick = () => {
        const charKey = card.getAttribute('data-char');
        if (window.cricketPvPRole === 'host') {
          window.p1SelectedChar = charKey;
        } else {
          window.p2SelectedChar = charKey;
        }
        updateCharSelectUI();
        updateReadyIndicatorUI();

        window.socket.emit('ps-game-message', {
          roomCode: roomCode,
          event: 'wwe-char-select',
          data: { role: window.cricketPvPRole, char: charKey }
        });
      };
    });
  }

  function checkStartBattle() {
    if (window.controllerSlots.PLAYER_1.ready && window.controllerSlots.PLAYER_2.ready) {
      if (typeof originalLockAndStart === 'function') {
        originalLockAndStart();
      }
    }
  }

})();
