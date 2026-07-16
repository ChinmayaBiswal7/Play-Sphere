/* ==========================================================================
   DELHI DEFIANCE - USER PROFILE LOGIN HUB
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  const loginScreen = document.getElementById('login-screen');
  const usernameInput = document.getElementById('login-username-input');
  const avatarOptions = document.querySelectorAll('.avatar-option');
  const btnGuest = document.getElementById('btn-login-guest');
  const btnGoogle = document.getElementById('btn-login-google');
  const errorMsg = document.getElementById('login-error-msg');

  // Pre-fill username from Firebase parent dashboard if accessible
  try {
    if (window.parent && window.parent.firebaseUser) {
      usernameInput.value = window.parent.firebaseUser.displayName || 'Sentinel';
    }
  } catch(e) {}

  let selectedAvatar = '1';

  // Avatar Selection Card clicks
  avatarOptions.forEach(opt => {
    opt.addEventListener('click', () => {
      window.SynthAudio.playClick();
      avatarOptions.forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      selectedAvatar = opt.getAttribute('data-avatar');
    });
  });

  // Action Triggers
  btnGuest.addEventListener('click', () => {
    window.SynthAudio.playClick();
    const val = usernameInput.value.trim();
    if (!val) {
      errorMsg.innerText = "PLEASE SPECIFY CALLSIGN!";
      return;
    }
    
    // Save to global state
    window.FPSState.currentUser.username = val;
    window.FPSState.currentUser.avatar = selectedAvatar;

    transitionToLobby();
  });

  btnGoogle.addEventListener('click', () => {
    window.SynthAudio.playClick();
    // Google Sign-in routing
    const val = usernameInput.value.trim() || "GoogleAgent";
    window.FPSState.currentUser.username = val;
    window.FPSState.currentUser.avatar = selectedAvatar;
    transitionToLobby();
  });

  function transitionToLobby() {
    loginScreen.classList.add('hidden');
    document.getElementById('lobby-screen').classList.remove('hidden');
    window.FPSState.gameState = window.STATES.LOBBY;
    
    // Notify lobby UI to update widgets
    if (window.lobbyUI) {
      window.lobbyUI.syncLobbyProfile();
      window.lobbyUI.initHologramScene();
    }
  }
});
