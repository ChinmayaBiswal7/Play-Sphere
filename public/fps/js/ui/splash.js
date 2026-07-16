/* ==========================================================================
   DELHI DEFIANCE — SPLASH LOADER
   Handles loading animation then transitions directly to Lobby.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  const splashScreen   = document.getElementById('splash-screen');
  const progressBar    = document.getElementById('splash-progress-bar');
  const statusLabel    = document.getElementById('splash-status-lbl');
  const lobbyScreen    = document.getElementById('lobby-screen');

  if (!splashScreen || !progressBar || !lobbyScreen) return;

  let progress = 0;
  const statusTexts = [
    { threshold: 15,  text: 'INITIALIZING 3D ENGINE...' },
    { threshold: 40,  text: 'COMPILING WEBGL SHADERS...' },
    { threshold: 65,  text: 'BUILDING RAJDHANI ARENA...' },
    { threshold: 85,  text: 'SPAWNING COMBAT BOTS...' },
    { threshold: 100, text: 'ESTABLISHING SENTINEL LINK...' }
  ];

  const interval = setInterval(() => {
    progress += Math.floor(Math.random() * 8) + 3;
    if (progress > 100) progress = 100;

    progressBar.style.width = `${progress}%`;

    const matched = statusTexts.find(s => progress <= s.threshold);
    if (matched && statusLabel) statusLabel.innerText = matched.text;

    if (progress >= 100) {
      clearInterval(interval);
      setTimeout(() => {
        // Hide splash
        splashScreen.style.display = 'none';

        // Try reading username from parent page (PlaySphere dashboard)
        try {
          if (window.parent && window.parent.firebaseUser) {
            window.FPSState.currentUser.username =
              window.parent.firebaseUser.displayName || 'Sentinel';
          }
        } catch (e) { /* cross-origin iframe guard */ }

        // Show lobby
        lobbyScreen.style.display = 'flex';
        window.FPSState.gameState = window.STATES ? window.STATES.LOBBY : 'LOBBY';

        // Sync profile and start 3D hologram
        if (window.lobbyUI) {
          window.lobbyUI.syncLobbyProfile();
          window.lobbyUI.initHologramScene();
        }
      }, 400);
    }
  }, 100);
});
