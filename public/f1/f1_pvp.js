/**
 * APEX STARS: Chibi F1 — Real-time Online PvP Sync Module
 * Reuses the native Grand Prix setup screens and launches 1v1 racing directly.
 */
(function () {
  'use strict';

  const params = new URLSearchParams(window.location.search);
  const roomCode = params.get('room') || (sessionStorage.getItem('ps_active_match') ? JSON.parse(sessionStorage.getItem('ps_active_match')).roomCode : null);

  if (!roomCode) return;

  console.log(`[F1 PvP] Intercepting startup for Room: ${roomCode}`);

  window.matchMode = 'PVP';
  window.cricketPvPRole = (sessionStorage.getItem('ps_match_role') === 'host' || window.location.hash === '#host') ? 'host' : 'guest';

  // Wait for game state to be ready
  const pollTimer = setInterval(() => {
    if (window.socket && window.f1SetupGame && window.openGrandPrixSetup) {
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

    // Show native Grand Prix Setup screen
    if (typeof window.openGrandPrixSetup === 'function') {
      window.openGrandPrixSetup();
    }

    // Hijack startGrandPrixWeekend
    const originalStartGP = window.startGrandPrixWeekend;
    window.startGrandPrixWeekend = function () {
      if (window.cricketPvPRole === 'host') {
        window.socket.emit('ps-game-message', {
          roomCode: roomCode,
          event: 'f1-start-race',
          data: {
            trackId: window.weekendConfig.selectedTrackId,
            hostTeamId: window.weekendConfig.selectedTeamId,
            hostDriverId: window.weekendConfig.selectedDriverId,
            raceLaps: window.weekendConfig.raceLaps,
            difficulty: window.weekendConfig.difficulty
          }
        });
        document.getElementById('grandPrixSetupScreen').style.display = 'none';
        launchF1Race(window.weekendConfig.selectedTrackId, window.weekendConfig.selectedTeamId, window.weekendConfig.selectedDriverId);
      }
    };

    // Hijack continue step to update button for guest
    const originalRenderStep = window.gpRenderStep;
    window.gpRenderStep = function (step) {
      if (typeof originalRenderStep === 'function') {
        originalRenderStep(step);
      }

      if (window.cricketPvPRole === 'guest') {
        const contBtn = document.getElementById('gp-btn-continue');
        if (contBtn && step === 4) {
          contBtn.innerText = "WAITING FOR HOST TO START...";
          contBtn.disabled = true;
          contBtn.style.opacity = '0.5';
          contBtn.onclick = null;
        }
      }
    };

    bindPvPSocketListeners();
  }

  function launchF1Race(trackId, teamId, driverId) {
    console.log(`[F1 PvP] Launching Race. Track: ${trackId}, Team: ${teamId}, Driver: ${driverId}`);

    // Lock in configurations
    window.f1SetActiveTrack(trackId);
    window.f1SetSelectedTeamIndex(teamId);
    if (window.weekendConfig) {
      window.weekendConfig.selectedTrackId = trackId;
      window.weekendConfig.selectedTeamId = teamId;
      window.weekendConfig.selectedDriverId = driverId;
    }

    // Set race session directly
    window.f1SetGameState("RACING");
    window.f1SetupGame();

    // Start network sync loop
    startF1PvPUpdates();
  }

  function startF1PvPUpdates() {
    const socket = window.socket;

    // Periodically broadcast local kart position to the opponent
    setInterval(() => {
      const player = window.f1GetPlayerKart ? window.f1GetPlayerKart() : null;
      const state = window.f1GetGameState ? window.f1GetGameState() : null;
      if (player && player.mesh && state === 'RACING') {
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

  function bindPvPSocketListeners() {
    const socket = window.socket;
    if (!socket) return;

    socket.on('ps-game-message', ({ event, data }) => {
      switch (event) {
        case 'f1-start-race':
          document.getElementById('grandPrixSetupScreen').style.display = 'none';
          launchF1Race(data.trackId, data.hostTeamId, data.hostDriverId);
          break;

        case 'f1-pos-sync':
          const racers = window.f1GetRacers ? window.f1GetRacers() : null;
          if (racers && racers[1]) {
            const remoteCar = racers[1];
            if (remoteCar.mesh) {
              remoteCar.mesh.position.set(data.pos.x, data.pos.y, data.pos.z);
              remoteCar.mesh.rotation.y = data.rotY;
            }
            remoteCar.currentOffset = data.offset;
            remoteCar.speed = data.speed;
          }
          break;
      }
    });
  }

})();
