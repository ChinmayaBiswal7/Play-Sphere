/**
 * Chibi Tennis Duel — Real-time Online PvP Sync Module
 */
(function () {
  'use strict';

  const params = new URLSearchParams(window.location.search);
  const roomCode = params.get('room') || (sessionStorage.getItem('ps_active_match') ? JSON.parse(sessionStorage.getItem('ps_active_match')).roomCode : null);

  if (!roomCode) return;

  console.log(`[Tennis PvP] Intercepting startup for Room: ${roomCode}`);

  window.matchMode = 'PVP';
  window.cricketPvPRole = (sessionStorage.getItem('ps_match_role') === 'host' || window.location.hash === '#host') ? 'host' : 'guest';

  // Wait for game state and socket to initialize
  const pollTimer = setInterval(() => {
    if (window.socket && window.STATES) {
      clearInterval(pollTimer);
      initTennisPvP();
    }
  }, 100);

  function initTennisPvP() {
    console.log("[Tennis PvP] Initializing network sync layer...");

    // Auto-join the socket room
    window.socket.emit('ps-game-join', {
      roomCode: roomCode,
      game: 'tennis',
      isHost: window.cricketPvPRole === 'host'
    });

    // Bypass QR pairing screen
    window.controllerSlots.PLAYER_1.connected = true;
    window.controllerSlots.PLAYER_2.connected = true;

    // Transition straight to match setup
    setTimeout(() => {
      if (typeof window.transitionToMatchSetup === 'function') {
        window.transitionToMatchSetup();
      }
    }, 800);

    // Bind network listeners
    bindNetworkEvents();

    // Map Keyboard controls fallback for online match
    setupKeyboardControls();

    // Sync match setup actions
    setupMatchConfigSync();
  }

  function bindNetworkEvents() {
    window.socket.on('ps-game-message', ({ event, data }) => {
      switch (event) {
        case 'tennis-input':
          // Apply inputs from the other player
          if (data.slot !== (window.cricketPvPRole === 'host' ? 'PLAYER_1' : 'PLAYER_2')) {
            Object.assign(window.playerInputs[data.slot], data.input);
          }
          break;

        case 'tennis-hit-ball':
          // Apply authoritative ball coordinates on hit to prevent physics drift
          if (window.ball) {
            window.ball.x = data.x;
            window.ball.y = data.y;
            window.ball.vx = data.vx;
            window.ball.vy = data.vy;
            window.ball.h = data.h;
            window.ball.vh = data.vh;
          }
          break;

        case 'tennis-score-sync':
          // Keep scoreboard identical
          window.p1Points = data.p1Points;
          window.p2Points = data.p2Points;
          window.p1Games = data.p1Games;
          window.p2Games = data.p2Games;
          window.p1Sets = data.p1Sets;
          window.p2Sets = data.p2Sets;
          break;

        case 'tennis-config-sync':
          // Sync options
          window.updateTargetPoints(data.points);
          break;

        case 'tennis-ready-sync':
          if (data.role === 'host') {
            window.controllerSlots.PLAYER_1.ready = data.ready;
          } else {
            window.controllerSlots.PLAYER_2.ready = data.ready;
          }
          checkReadyAndStart();
          break;
      }
    });

    // Intercept ball hits to broadcast coordinates
    const originalBallHit = window.ballHit || (window.players && window.players.PLAYER_1 && window.players.PLAYER_1.swing);
    // Hook into ball bounce/hitter updates in game loop
    const originalUpdateBall = window.ball && window.ball.update;
  }

  function setupKeyboardControls() {
    const keysPressed = {};
    const mySlot = (window.cricketPvPRole === 'host') ? 'PLAYER_1' : 'PLAYER_2';

    window.addEventListener('keydown', (e) => {
      keysPressed[e.code] = true;
      updateInputs();
    });

    window.addEventListener('keyup', (e) => {
      keysPressed[e.code] = false;
      updateInputs();
    });

    function updateInputs() {
      if (window.gameState === window.STATES.CONTROLLER_LOBBY) return;

      const input = window.playerInputs[mySlot];
      if (!input) return;

      // Movement
      let mx = 0;
      let my = 0;
      if (keysPressed['KeyW'] || keysPressed['ArrowUp']) my = -1;
      if (keysPressed['KeyS'] || keysPressed['ArrowDown']) my = 1;
      if (keysPressed['KeyA'] || keysPressed['ArrowLeft']) mx = -1;
      if (keysPressed['KeyD'] || keysPressed['ArrowRight']) mx = 1;

      input.moveX = mx;
      input.moveY = my;

      // Buttons
      input.hit = !!keysPressed['KeyJ'];
      input.lob = !!keysPressed['KeyK'];
      input.power = !!keysPressed['KeyL'];
      input.dive = !!keysPressed['Space'];

      // Sync input to the other player
      window.socket.emit('ps-game-message', {
        roomCode: roomCode,
        event: 'tennis-input',
        data: { slot: mySlot, input }
      });
    }

    // Periodically send physics correction to receiver
    setInterval(() => {
      if (window.gameState === window.STATES.RALLY && window.ball) {
        // Hitter sends coordinates
        if ((window.lastHitter === 'PLAYER_1' && window.cricketPvPRole === 'host') || 
            (window.lastHitter === 'PLAYER_2' && window.cricketPvPRole === 'guest')) {
          window.socket.emit('ps-game-message', {
            roomCode: roomCode,
            event: 'tennis-hit-ball',
            data: {
              x: window.ball.x,
              y: window.ball.y,
              vx: window.ball.vx,
              vy: window.ball.vy,
              h: window.ball.h,
              vh: window.ball.vh
            }
          });
        }
      }
    }, 200);

    // Sync score on point end
    setInterval(() => {
      if (window.gameState === window.STATES.POINT_END && window.cricketPvPRole === 'host') {
        window.socket.emit('ps-game-message', {
          roomCode: roomCode,
          event: 'tennis-score-sync',
          data: {
            p1Points: window.p1Points,
            p2Points: window.p2Points,
            p1Games: window.p1Games,
            p2Games: window.p2Games,
            p1Sets: window.p1Sets,
            p2Sets: window.p2Sets
          }
        });
      }
    }, 1000);
  }

  function setupMatchConfigSync() {
    // Intercept format changes (Host only)
    document.querySelectorAll('.target-options .option-card').forEach(card => {
      const originalClick = card.onclick;
      card.onclick = () => {
        if (window.cricketPvPRole !== 'host') return; // Only host chooses points length
        
        const pts = parseInt(card.getAttribute('data-points'));
        window.updateTargetPoints(pts);

        window.socket.emit('ps-game-message', {
          roomCode: roomCode,
          event: 'tennis-config-sync',
          data: { points: pts }
        });
      };
    });

    // Rematch button sync
    const originalReadyRematch = document.getElementById('btn-rematch');
    if (originalReadyRematch) {
      originalReadyRematch.onclick = () => {
        const mySlot = (window.cricketPvPRole === 'host') ? 'PLAYER_1' : 'PLAYER_2';
        const nextReady = !window.controllerSlots[mySlot].ready;
        window.controllerSlots[mySlot].ready = nextReady;

        window.socket.emit('ps-game-message', {
          roomCode: roomCode,
          event: 'tennis-ready-sync',
          data: { role: window.cricketPvPRole, ready: nextReady }
        });

        checkReadyAndStart();
      };
    }
  }

  function checkReadyAndStart() {
    const p1R = window.controllerSlots.PLAYER_1.ready ? 1 : 0;
    const p2R = window.controllerSlots.PLAYER_2.ready ? 1 : 0;
    const btn = document.getElementById('btn-rematch');
    if (btn) btn.innerText = `REMATCH (${p1R + p2R}/2 READY)`;

    if (window.controllerSlots.PLAYER_1.ready && window.controllerSlots.PLAYER_2.ready) {
      if (typeof window.resetMatchToSetup === 'function') {
        window.resetMatchToSetup();
      }
    }
  }

})();
