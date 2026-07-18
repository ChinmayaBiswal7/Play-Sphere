/**
 * Football Pro 2026 — Online PvP Lobby Bootstrapper
 * Simulates user navigation to launch the native multiplayer friendly lobby.
 */
(function () {
  'use strict';

  const params = new URLSearchParams(window.location.search);
  const roomCode = params.get('room') || (sessionStorage.getItem('ps_active_match') ? JSON.parse(sessionStorage.getItem('ps_active_match')).roomCode : null);

  if (!roomCode) return;

  console.log(`[Football PvP] Intercepting match startup for Room: ${roomCode}`);

  // Wait for menu elements to fully render and load
  const pollTimer = setInterval(() => {
    const tabBtn = document.getElementById('btn-tab-multiplayer');
    const socket = window.SocketController && window.SocketController.socket;

    if (tabBtn && socket && socket.connected) {
      clearInterval(pollTimer);
      launchFriendlyLobby(tabBtn, roomCode);
    }
  }, 100);

  function launchFriendlyLobby(tabBtn, room) {
    console.log("[Football PvP] Switching to Multiplayer view...");
    tabBtn.click();

    // Wait a brief moment for the tab content to render
    setTimeout(() => {
      const friendlyTab = document.getElementById('tab-friendly');
      if (friendlyTab) {
        friendlyTab.click(); // Switch to friendly sub-tab
        
        setTimeout(() => {
          const input = document.getElementById('pvp-code-input');
          const joinBtn = document.getElementById('btn-join-pvp');

          if (input && joinBtn) {
            console.log(`[Football PvP] Auto-entering room code: ${room}`);
            input.value = room;
            joinBtn.click();
          } else {
            console.warn("[Football PvP] Friendly inputs not found in DOM.");
          }
        }, 150);
      }
    }, 150);
  }
})();
