/**
 * Delhi Defiance FPS — Online PvP Match Auto-Join and Interceptor
 */
(function () {
  'use strict';

  // Read room from URL or sessionStorage
  const params = new URLSearchParams(window.location.search);
  const roomCode = params.get('room') || (sessionStorage.getItem('ps_active_match') ? JSON.parse(sessionStorage.getItem('ps_active_match')).roomCode : null);

  if (!roomCode) {
    console.log("[FPS PvP Boot] No PvP room code active. Running in standard local mode.");
    return;
  }

  console.log(`[FPS PvP Boot] Intercepting match startup for Room: ${roomCode}`);

  // Wait for MultiplayerManager to initialize
  const pollTimer = setInterval(() => {
    if (window.FPSGameLoop && window.FPSGameLoop.multiplayer) {
      clearInterval(pollTimer);
      startPvPFlow(roomCode);
    }
  }, 100);

  function startPvPFlow(room) {
    const mp = window.FPSGameLoop.multiplayer;
    console.log("[FPS PvP Boot] MultiplayerManager initialized. Auto-joining PvP room...");

    // Hide standard menus and show multiplayer lobby overlay
    const splash = document.getElementById('splash-screen');
    if (splash) splash.style.display = 'none';
    
    const lobby = document.getElementById('lobby-screen');
    if (lobby) lobby.style.display = 'none';

    const pvpLobby = document.getElementById('multiplayer-lobby-overlay');
    if (pvpLobby) pvpLobby.style.display = 'flex';

    // Get current username or fallback
    let username = 'Player';
    try {
      if (window.parent && window.parent.currentUser) {
        username = window.parent.currentUser.username;
      }
    } catch(e) {}

    // Auto join the lobby
    mp.joinRoom(room, 'agni', username);

    // Host checks role to trigger automatic match start once guest joins
    const isHost = (sessionStorage.getItem('ps_match_role') === 'host' || window.location.hash === '#host');

    mp.socket.on('fps-pvp-room-joined', ({ players }) => {
      console.log(`[FPS PvP Boot] Room joined event. Player count: ${players.length}`);
      if (players.length === 2 && isHost) {
        console.log("[FPS PvP Boot] Both players joined. Auto-starting match in 1.5 seconds...");
        setTimeout(() => {
          mp.startMatch();
        }, 1500);
      }
    });

    mp.socket.on('fps-pvp-room-created', ({ players }) => {
      console.log(`[FPS PvP Boot] Room created event. Player count: ${players.length}`);
      if (players.length === 2 && isHost) {
        console.log("[FPS PvP Boot] Both players joined. Auto-starting match in 1.5 seconds...");
        setTimeout(() => {
          mp.startMatch();
        }, 1500);
      }
    });
  }
})();
