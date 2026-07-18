/**
 * APEX STARS: Chibi F1 — Real-time Online PvP Sync Module
 */
(function () {
  'use strict';

  const params = new URLSearchParams(window.location.search);
  const roomCode = params.get('room') || (sessionStorage.getItem('ps_active_match') ? JSON.parse(sessionStorage.getItem('ps_active_match')).roomCode : null);

  if (!roomCode) return;

  console.log(`[F1 PvP] Intercepting startup for Room: ${roomCode}`);

  window.matchMode = 'PVP';
  window.cricketPvPRole = (sessionStorage.getItem('ps_match_role') === 'host' || window.location.hash === '#host') ? 'host' : 'guest';

  // Wait for game and socket to initialize
  const pollTimer = setInterval(() => {
    if (window.socket && window.f1SetupGame) {
      clearInterval(pollTimer);
      initF1PvP();
    }
  }, 100);

  function initF1PvP() {
    console.log("[F1 PvP] Initializing network sync layer...");

    // Join the socket room
    window.socket.emit('ps-game-join', {
      roomCode: roomCode,
      game: 'f1',
      isHost: window.cricketPvPRole === 'host'
    });

    // Configure race setup to skip menus and launch directly
    setTimeout(() => {
      // Force Grand Prix Weekend configuration
      window.f1SetSelectedTeamIndex(0);
      window.f1SetActiveTrack(0);
      window.f1SetGameState("RACING");
      window.f1SetupGame();

      // Hide landing and workstation UI overlays
      const landing = document.getElementById('main-landing-screen');
      if (landing) landing.classList.add('hidden');
      const ws = document.getElementById('workstationScreen');
      if (ws) ws.style.display = 'none';

      // Start network loops
      startF1PvPUpdates();
    }, 1000);
  }

  function startF1PvPUpdates() {
    const socket = window.socket;
    const isHost = (window.cricketPvPRole === 'host');

    socket.on('ps-game-message', ({ event, data }) => {
      if (event === 'f1-pos-sync') {
        const racers = window.f1GetRacers ? window.f1GetRacers() : null;
        if (racers && racers[1]) {
          const remoteCar = racers[1];
          // Sync position, heading and speed
          if (remoteCar.mesh) {
            remoteCar.mesh.position.set(data.pos.x, data.pos.y, data.pos.z);
            remoteCar.mesh.rotation.y = data.rotY;
          }
          remoteCar.currentOffset = data.offset;
          remoteCar.speed = data.speed;
        }
      }
    });

    // Periodically broadcast local kart position to the opponent
    setInterval(() => {
      const player = window.f1GetPlayerKart ? window.f1GetPlayerKart() : null;
      if (player && player.mesh && window.gameState === 'RACING') {
        socket.emit('ps-game-message', {
          roomCode: roomCode,
          event: 'f1-pos-sync',
          data: {
            pos: { x: player.mesh.position.x, y: player.mesh.position.y, z: player.mesh.position.z },
            rotY: player.mesh.rotation.y,
            offset: player.currentOffset || 0,
            speed: player.speed || 0
          }
        });
      }
    }, 80);
  }

})();
