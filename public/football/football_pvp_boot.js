/**
 * Football Pro 2026 — Online PvP Auto-Join and Match Launch Interceptor
 */
(function () {
  'use strict';

  // Read room from URL or sessionStorage
  const params = new URLSearchParams(window.location.search);
  const roomCode = params.get('room') || (sessionStorage.getItem('ps_active_match') ? JSON.parse(sessionStorage.getItem('ps_active_match')).roomCode : null);

  if (!roomCode) {
    console.log("[PVP Boot] No PvP room code active. Running in standard local mode.");
    return;
  }

  console.log(`[PVP Boot] Intercepting match startup for Room: ${roomCode}`);

  // Wait for SocketController to connect
  const pollTimer = setInterval(() => {
    if (window.SocketController && window.SocketController.socket && window.SocketController.socket.connected) {
      clearInterval(pollTimer);
      startPvPFlow(roomCode);
    }
  }, 100);

  function startPvPFlow(room) {
    const socket = window.SocketController.socket;
    console.log("[PVP Boot] Socket connected. Joining PvP room...");

    // Auto-join the room on the server
    socket.emit('pvp-join-room', { roomCode: room });

    // Handle room updates and ready signals
    socket.on('pvp-room-created', (data) => {
      console.log("[PVP Boot] Room created on server. Selecting team and setting ready...");
      window.SocketController.pvpSlot = 1; // Host slot
      socket.emit('pvp-select-team', { teamName: 'RED DEVILS' });
      socket.emit('pvp-ready', { ready: true });
    });

    socket.on('pvp-room-joined', (data) => {
      console.log("[PVP Boot] Joined room. Selecting opponent team and setting ready...");
      window.SocketController.pvpSlot = 2; // Guest slot
      socket.emit('pvp-select-team', { teamName: 'PARIS STARS' });
      socket.emit('pvp-ready', { ready: true });
    });

    // Authoritative Match Start trigger
    socket.on('pvp-match-started', (data) => {
      console.log("[PVP Boot] Server started PvP match. Bypassing menu and launching match!");

      // Hide main menu screen
      const menuScreen = document.getElementById('main-menu-screen');
      if (menuScreen) menuScreen.style.display = 'none';

      const subScreen = document.getElementById('subscreen-view');
      if (subScreen) subScreen.style.display = 'none';

      // Dynamically load the PvP controller and start
      import('./pvp.js').then(module => {
        const slot = window.SocketController.pvpSlot || 2;
        module.launchMatchInPvPMode(room, slot, data.homeTeam, data.awayTeam);
      }).catch(err => {
        console.error("[PVP Boot] Failed to launch PvP match:", err);
      });
    });

    // Handle room error fallbacks
    socket.on('pvp-error', (msg) => {
      console.error("[PVP Boot] PvP connection error:", msg);
      alert("PvP Room Error: " + msg);
    });
  }
})();
