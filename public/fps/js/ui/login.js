/* ==========================================================================
   DELHI DEFIANCE - USER PROFILE LOGIN HUB
   ========================================================================== */

function initLogin() {
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

  // Guest login flow
  btnGuest.addEventListener('click', () => {
    window.SynthAudio.playClick();
    const val = usernameInput.value.trim() || "GuestAgent";
    window.FPSState.currentUser.username = val;
    window.FPSState.currentUser.avatar = selectedAvatar;
    transitionToLobby();
  });

  // Google sign-in flow
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
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLogin);
} else {
  initLogin();
}
