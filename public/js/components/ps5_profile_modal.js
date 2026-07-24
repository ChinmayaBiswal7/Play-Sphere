/**
 * PlaySphere User Profile Modal Component Logic
 */

(function () {
  'use strict';

  let currentAuthState = 'options';
  let activeProfileView = 'hub'; // 'hub', 'pvp_details', 'game_details'
  let focusedRow = 0; // 0: friends, 1: games
  let focusedCol = 0; // 0, 1, 2
  let selectedFriendUid = '';
  let selectedGameKey = '';
  let currentDisplayFriends = [];
  const PROFILE_GAMES = ['cricket', 'f1', 'mortal'];

  window.syncPlaySphereProfileDisplay = function() {
    const profile = window.profile;
    if (!profile) return;

    const currentUser = window.currentUser;

    // 1. Toggle Login Prompt vs Main Profile Hub View
    const mainView = document.getElementById('ps5-profile-main-view');
    const loginView = document.getElementById('ps5-profile-login-view');
    const closeBtn = document.getElementById('ps5-profile-close-btn');
    const profCard = document.querySelector('#ps5-profile-modal .ps5-profile-card');

    // Gate the entire dashboard: nothing opens for guests
    const isGuest = !currentUser || window.profileNeedsComplete;
    if (closeBtn) {
      closeBtn.style.display = isGuest ? 'none' : 'block';
    }

    if (profCard) {
      if (currentUser && !window.profileNeedsComplete) {
        // Main Profile Hub — fixed size set in CSS, just ensure flex-direction is row
        profCard.style.display = 'flex';
        profCard.style.flexDirection = 'row';
        profCard.style.width = '840px';
        profCard.style.height = '500px';
        profCard.style.maxWidth = '95vw';
        profCard.style.minWidth = '';
        profCard.style.minHeight = '';
        profCard.style.maxHeight = '';
        profCard.style.alignItems = '';
        profCard.style.justifyContent = '';
        profCard.style.aspectRatio = 'auto';
      } else {
        // Login Splash screen (Narrow Single-Column)
        profCard.style.display = 'flex';
        profCard.style.flexDirection = 'column';
        profCard.style.alignItems = 'center';
        profCard.style.justifyContent = 'center';
        profCard.style.aspectRatio = 'auto';
        profCard.style.height = 'auto';
        profCard.style.width = '';

        if (currentAuthState === 'options') {
          profCard.style.maxWidth = '450px';
          profCard.style.minHeight = '540px';
        } else {
          profCard.style.maxWidth = '360px';
          profCard.style.minHeight = '500px';
        }
      }
    }

    if (mainView && loginView) {
      if (currentUser && !window.profileNeedsComplete) {
        mainView.style.display = 'contents';
        // Only auto-close the modal if it was NOT intentionally opened by the user
        const profModal = document.getElementById('ps5-profile-modal');
        if (profModal && !profModal.dataset.userOpened) {
          profModal.classList.remove('show');
        }
        loginView.style.display = 'none';
      } else {
        mainView.style.display = 'none';
        loginView.style.display = 'flex';
        
        // Force modal to show if guest to block the dashboard (only after the console has booted!)
        const profModal = document.getElementById('ps5-profile-modal');
        const dash = document.getElementById('ps5-dash');
        const isBooted = dash && dash.style.display === 'flex';
        if (profModal && isBooted && !profModal.classList.contains('show')) {
          profModal.classList.add('show');
        }

        // Dynamic toggle for branding text based on login screen state
        const brandingTextEl = document.getElementById('ps5-profile-login-branding-text');
        if (brandingTextEl) {
          brandingTextEl.style.display = (currentAuthState === 'options') ? 'flex' : 'none';
        }

        // Render correct form inside Right Pane
        const rightPane = document.getElementById('ps5-profile-login-right');
        if (rightPane) {
          if (!currentUser) {
            if (currentAuthState === 'options') {
              rightPane.innerHTML = `
                <div style="width: 280px; display: flex; flex-direction: column; gap: 12px; align-items: stretch; margin-top: 10px;">
                  <button id="options-signin-btn" style="width:100%; height:46px; background:#3b82f6; color:#ffffff; border:none; border-radius:8px; font-size:0.95rem; font-weight:700; display:flex; align-items:center; justify-content:center; cursor:pointer; box-shadow:0 4px 15px rgba(59,130,246,0.35); text-transform:none; letter-spacing:normal; font-family:inherit;">
                    Sign In
                  </button>

                  <button id="options-register-btn" style="width:100%; height:46px; background:transparent; border:1px solid rgba(255,255,255,0.22); color:rgba(255,255,255,0.85); border-radius:8px; font-size:0.95rem; font-weight:700; display:flex; align-items:center; justify-content:center; cursor:pointer; white-space:nowrap; text-transform:none; letter-spacing:normal; font-family:inherit;">
                    Create Account
                  </button>
                </div>
              `;

              // Bind events
              document.getElementById('options-signin-btn').onclick = () => {
                currentAuthState = 'login';
                window.syncPlaySphereProfileDisplay();
              };
              document.getElementById('options-register-btn').onclick = () => {
                currentAuthState = 'register';
                window.syncPlaySphereProfileDisplay();
              };
            } else if (currentAuthState === 'login') {
              rightPane.innerHTML = `
                <div style="width: 280px; display: flex; flex-direction: column; gap: 16px; align-items: stretch; text-align: center;">
                  <a href="#" id="login-back-btn" style="color:rgba(255,255,255,0.45); text-decoration:none; font-size:0.88rem; font-weight:600; display:flex; align-items:center; gap:6px; font-family:inherit; align-self:flex-start; margin-bottom:-4px;">
                    ← Back
                  </a>

                  <h3 style="font-size:1.45rem; font-weight:700; margin:0 0 4px 0; text-align:center; color:#ffffff; font-family:inherit;">Sign In</h3>
                  
                  <button id="login-google-btn" style="width:100%; height:44px; background:#ffffff; color:#020617; border:none; border-radius:8px; font-size:0.95rem; font-weight:700; display:flex; align-items:center; justify-content:center; gap:12px; cursor:pointer; box-shadow:0 4px 15px rgba(0,0,0,0.3); white-space:nowrap; text-transform:none; letter-spacing:normal; font-family:inherit;">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style="flex-shrink:0;"><path d="M12.24 10.285V13.4h6.887C18.2 15.614 15.645 18 12.24 18c-3.86 0-7-3.14-7-7s3.14-7 7-7c1.7 0 3.3.6 4.5 1.8l2.4-2.4C17.3 1.8 14.9 1 12.24 1 6.58 1 2 5.58 2 11.24s4.58 10.24 10.24 10.24c5.9 0 10.24-4.14 10.24-10.24 0-.7-.08-1.37-.2-1.96H12.24z"/></svg>
                    Continue with Google
                  </button>

                  <div style="display:flex; align-items:center; width:100%; color:rgba(255,255,255,0.2); font-size:0.72rem; gap:10px; margin:2px 0;">
                    <div style="flex:1; height:1px; background:rgba(255,255,255,0.08);"></div>
                    <span>or email</span>
                    <div style="flex:1; height:1px; background:rgba(255,255,255,0.08);"></div>
                  </div>

                  <input type="email" id="login-email-input" placeholder="Email Address" style="width:100%; height:44px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); border-radius:8px; padding:0 14px; color:#ffffff; font-size:0.95rem; box-sizing:border-box; outline:none; font-family:inherit;">
                  
                  <div style="position: relative; width: 100%;">
                    <input type="password" id="login-pass-input" placeholder="Password" style="width:100%; height:44px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); border-radius:8px; padding:0 40px 0 14px; color:#ffffff; font-size:0.95rem; box-sizing:border-box; outline:none; font-family:inherit;">
                    <button id="toggle-login-pass" type="button" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; color: rgba(255,255,255,0.5); cursor: pointer; padding: 4px; display: flex; align-items: center; justify-content: center; outline: none;">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" id="eye-icon-login">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    </button>
                  </div>

                  <div id="login-error-msg" style="color:#ef4444; font-size:0.8rem; text-align:center; height:16px; margin:-8px 0; font-family:inherit;"></div>

                  <button id="login-submit-btn" style="width:100%; height:44px; background:#3b82f6; color:#ffffff; border:none; border-radius:8px; font-size:0.95rem; font-weight:700; display:flex; align-items:center; justify-content:center; cursor:pointer; text-transform:none; letter-spacing:normal; font-family:inherit; box-shadow:0 4px 15px rgba(59,130,246,0.3);">
                    Sign In
                  </button>
                </div>
              `;

              // Bind events
              document.getElementById('login-back-btn').onclick = (e) => {
                e.preventDefault();
                currentAuthState = 'options';
                window.syncPlaySphereProfileDisplay();
              };
              document.getElementById('login-google-btn').onclick = async () => {
                if (window.ui && window.ui.profileLoginBtn) {
                  window.ui.profileLoginBtn.click();
                }
              };
              const toggleLoginPass = document.getElementById('toggle-login-pass');
              if (toggleLoginPass) {
                toggleLoginPass.onclick = (e) => {
                  e.preventDefault();
                  const passInput = document.getElementById('login-pass-input');
                  const eyeIcon = document.getElementById('eye-icon-login');
                  if (passInput && eyeIcon) {
                    if (passInput.type === 'password') {
                      passInput.type = 'text';
                      eyeIcon.innerHTML = `
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                      `;
                    } else {
                      passInput.type = 'password';
                      eyeIcon.innerHTML = `
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      `;
                    }
                  }
                };
              }
              document.getElementById('login-submit-btn').onclick = async () => {
                const email = document.getElementById('login-email-input').value.trim();
                const pass = document.getElementById('login-pass-input').value;
                const errDiv = document.getElementById('login-error-msg');
                if (!email || !pass) {
                  errDiv.textContent = 'Please fill all fields.';
                  return;
                }
                try {
                  errDiv.textContent = 'Signing in...';
                  if (typeof window.fbSignInWithEmail === 'function') {
                    await window.fbSignInWithEmail(email, pass);
                  }
                } catch (err) {
                  errDiv.textContent = err.message || 'Login failed.';
                }
              };
            } else if (currentAuthState === 'register') {
              rightPane.innerHTML = `
                <div style="width: 280px; display: flex; flex-direction: column; gap: 16px; align-items: stretch; text-align: center;">
                  <a href="#" id="signup-back-btn" style="color:rgba(255,255,255,0.45); text-decoration:none; font-size:0.88rem; font-weight:600; display:flex; align-items:center; gap:6px; font-family:inherit; align-self:flex-start; margin-bottom:-4px;">
                    ← Back
                  </a>

                  <h3 style="font-size:1.5rem; font-weight:700; margin:0 0 4px 0; text-align:center; color:#ffffff; font-family:inherit;">Create Account</h3>

                  <input type="email" id="signup-email-input" placeholder="Email Address" style="width:100%; height:44px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); border-radius:8px; padding:0 14px; color:#ffffff; font-size:0.95rem; box-sizing:border-box; outline:none; font-family:inherit;">
                  
                  <div style="position: relative; width: 100%;">
                    <input type="password" id="signup-pass-input" placeholder="Password (Min 6 chars)" style="width:100%; height:44px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); border-radius:8px; padding:0 40px 0 14px; color:#ffffff; font-size:0.95rem; box-sizing:border-box; outline:none; font-family:inherit;">
                    <button id="toggle-signup-pass" type="button" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; color: rgba(255,255,255,0.5); cursor: pointer; padding: 4px; display: flex; align-items: center; justify-content: center; outline: none;">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" id="eye-icon-signup">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    </button>
                  </div>

                  <div id="signup-error-msg" style="color:#ef4444; font-size:0.8rem; text-align:center; height:16px; margin:-8px 0; font-family:inherit;"></div>

                  <button id="signup-submit-btn" style="width:100%; height:44px; background:#10b981; color:#ffffff; border:none; border-radius:8px; font-size:0.95rem; font-weight:700; display:flex; align-items:center; justify-content:center; cursor:pointer; text-transform:none; letter-spacing:normal; font-family:inherit; box-shadow:0 4px 15px rgba(16,185,129,0.3);">
                    Create Account
                  </button>
                </div>
              `;

              // Bind events
              document.getElementById('signup-back-btn').onclick = (e) => {
                e.preventDefault();
                currentAuthState = 'options';
                window.syncPlaySphereProfileDisplay();
              };
              const toggleSignupPass = document.getElementById('toggle-signup-pass');
              if (toggleSignupPass) {
                toggleSignupPass.onclick = (e) => {
                  e.preventDefault();
                  const passInput = document.getElementById('signup-pass-input');
                  const eyeIcon = document.getElementById('eye-icon-signup');
                  if (passInput && eyeIcon) {
                    if (passInput.type === 'password') {
                      passInput.type = 'text';
                      eyeIcon.innerHTML = `
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                      `;
                    } else {
                      passInput.type = 'password';
                      eyeIcon.innerHTML = `
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      `;
                    }
                  }
                };
              }
              document.getElementById('signup-submit-btn').onclick = async () => {
                const email = document.getElementById('signup-email-input').value.trim();
                const pass = document.getElementById('signup-pass-input').value;
                const errDiv = document.getElementById('signup-error-msg');
                if (!email || !pass) {
                  errDiv.textContent = 'Please fill all fields.';
                  return;
                }
                if (pass.length < 6) {
                  errDiv.textContent = 'Password must be at least 6 chars.';
                  return;
                }
                try {
                  errDiv.textContent = 'Creating account...';
                  if (typeof window.fbCreateUserWithEmail === 'function') {
                    await window.fbCreateUserWithEmail(email, pass);
                  }
                } catch (err) {
                  errDiv.textContent = err.message || 'Signup failed.';
                }
              };
            }
          } else {
            // USER is authenticated, but needs to Complete Profile!
            rightPane.innerHTML = `
              <div style="width: 280px; display: flex; flex-direction: column; gap: 16px; align-items: stretch; text-align: center;">
                <h3 style="font-size:1.5rem; font-weight:700; margin:0 0 6px 0; text-align:center; color:#ffffff; font-family:inherit;">Complete Profile</h3>
                <p style="color:rgba(255,255,255,0.55); font-size:0.85rem; text-align:center; margin:0 0 4px 0; line-height:1.4;">
                  Choose a username and enter your date of birth to complete your PlaySphere profile.
                </p>

                <input type="text" id="setup-username-input" placeholder="Choose Username" style="width:100%; height:44px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); border-radius:8px; padding:0 14px; color:#ffffff; font-size:0.95rem; box-sizing:border-box; outline:none; font-family:inherit;">
                
                <div style="display:flex; flex-direction:column; gap:4px; text-align:left; box-sizing:border-box;">
                  <label style="font-size:0.78rem; color:rgba(255,255,255,0.45); font-family:inherit;">Date of Birth</label>
                  <input type="date" id="setup-dob-input" style="width:100%; height:44px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); border-radius:8px; padding:0 14px; color:#ffffff; font-size:0.95rem; color-scheme:dark; box-sizing:border-box; outline:none; font-family:inherit;">
                </div>

                <div id="setup-error-msg" style="color:#ef4444; font-size:0.8rem; text-align:center; height:16px; margin:-8px 0; font-family:inherit;"></div>

                <button id="setup-submit-btn" style="width:100%; height:44px; background:#60a5fa; color:#020617; border:none; border-radius:8px; font-size:0.95rem; font-weight:700; display:flex; align-items:center; justify-content:center; cursor:pointer; text-transform:none; letter-spacing:normal; font-family:inherit; box-shadow:0 4px 15px rgba(96,165,250,0.3);">
                  Save & Continue
                </button>
              </div>
            `;

            // Bind events
            document.getElementById('setup-submit-btn').onclick = async () => {
              const username = document.getElementById('setup-username-input').value.trim();
              const dob = document.getElementById('setup-dob-input').value;
              const errDiv = document.getElementById('setup-error-msg');
              if (!username || !dob) {
                errDiv.textContent = 'Please fill all fields.';
                return;
              }
              try {
                errDiv.textContent = 'Saving details...';
                if (typeof window.saveUserProfileDetails === 'function') {
                  await window.saveUserProfileDetails(username, dob);
                  const pM = document.getElementById('ps5-profile-modal');
                  if (pM) { delete pM.dataset.userOpened; pM.classList.remove('show'); }
                  window.syncPlaySphereProfileDisplay();
                }
              } catch (err) {
                errDiv.textContent = err.message || 'Failed to save.';
              }
            };
          }
        }
      }
    }

    const level = Math.floor((profile.xp || 0) / 500) + 1;
    const currentXp = (profile.xp || 0) % 500;
    const xpPercent = Math.min(100, (currentXp / 500) * 100);

    // 2. Header displays
    const headerUser = document.getElementById('ps5-header-username');
    if (headerUser) {
      if (currentUser && !window.profileNeedsComplete) {
        headerUser.textContent = currentUser.displayName || profile.username || 'Gamer';
        headerUser.style.color = '#ffffff';
      } else {
        headerUser.textContent = 'Sign In';
        headerUser.style.color = '#60a5fa';
      }
    }
    
    // 3. Profile Hub displays
    if (currentUser && !window.profileNeedsComplete) {
      const usernameVal = document.getElementById('ps5-profile-username-val');
      const lvlVal = document.getElementById('ps5-profile-lvl-val');
      const xpVal = document.getElementById('ps5-profile-xp-val');
      const xpFill = document.getElementById('ps5-profile-xp-fill');
      const coinsVal = document.getElementById('ps5-profile-coins-val');

      if (usernameVal) usernameVal.textContent = currentUser.displayName || profile.username || 'Gamer';
      if (lvlVal) lvlVal.textContent = `LEVEL ${level}`;
      if (xpVal) xpVal.textContent = `${currentXp} / 500 XP`;
      if (xpFill) xpFill.style.width = `${xpPercent}%`;
      if (coinsVal) coinsVal.textContent = `${profile.coins || 0} Coins`;
      
      // Stats
      const statPlayed = document.getElementById('ps5-stat-played');
      const statWon = document.getElementById('ps5-stat-won');
      const statRuns = document.getElementById('ps5-stat-runs');
      const statWickets = document.getElementById('ps5-stat-wickets');

      if (statPlayed) statPlayed.textContent = profile.played || 0;
      if (statWon) statWon.textContent = profile.won || 0;
      if (statRuns) statRuns.textContent = profile.runs || 0;
      if (statWickets) statWickets.textContent = profile.wickets || 0;
    }

    // 4. Avatar Images
    const avatarHtml = (currentUser && !window.profileNeedsComplete && currentUser.photoURL)
      ? `<img src="${currentUser.photoURL}" alt="avatar" class="ps5-avatar-btn-img">`
      : `<div class="ps5-avatar-btn-img" style="line-height:24px; text-align:center; background:rgba(255,255,255,0.08); color:rgba(255,255,255,0.5); font-size:0.85rem; font-weight:700;">👤</div>`;

    const headerAvatar = document.getElementById('ps5-header-avatar');
    if (headerAvatar) {
      headerAvatar.innerHTML = avatarHtml;
    }

    if (currentUser && !window.profileNeedsComplete) {
      const avatarContainer = document.getElementById('ps5-profile-avatar-container');
      if (avatarContainer) {
        avatarContainer.innerHTML = currentUser.photoURL
          ? `<img src="${currentUser.photoURL}" alt="avatar" class="ps5-profile-big-avatar">`
          : `<div class="ps5-profile-big-avatar" style="line-height:110px; text-align:center; background:#3b82f6; color:#ffffff; font-size:3rem; font-weight:700; border-radius:50%;">${(profile.username || 'G')[0]}</div>`;
      }
    }

    // 5. Auth Button State
    const authBtn = document.getElementById('ps5-profile-auth-btn');
    if (authBtn) {
      if (currentUser) {
        authBtn.textContent = 'Sign Out';
        authBtn.style.background = 'rgba(239, 68, 68, 0.2)';
        authBtn.style.color = '#ef4444';
        authBtn.style.border = '1px solid rgba(239,68,68,0.4)';
      } else {
        authBtn.textContent = 'Sign In';
        authBtn.style.background = '#ffffff';
        authBtn.style.color = '#020617';
        authBtn.style.border = 'none';
      }
    }

    // 6. PvP Friends & Game Library Grid Setup
    if (currentUser && !window.profileNeedsComplete) {
      // 6a. Only show REAL accepted friends — no mock data
      const realFriends = [];
      if (window.friendsManager && window.friendsManager.activeFriendProfiles &&
          window.friendsManager.activeFriendProfiles.length > 0) {
        window.friendsManager.activeFriendProfiles.forEach(p => {
          realFriends.push({
            uid: p.uid,
            username: p.username || 'Gamer',
            online: !!(window.friendsManager._lastPresenceMap &&
                       window.friendsManager._lastPresenceMap[p.uid] &&
                       window.friendsManager._lastPresenceMap[p.uid].online),
            activity: (window.friendsManager._lastPresenceMap &&
                       window.friendsManager._lastPresenceMap[p.uid] &&
                       window.friendsManager._lastPresenceMap[p.uid].activity) || 'Offline'
          });
        });
      }
      currentDisplayFriends = realFriends;

      // 6b. Render friends grid — empty state if no friends yet
      const friendsGrid = document.getElementById('profile-friends-grid');
      if (friendsGrid) {
        if (realFriends.length === 0) {
          friendsGrid.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:rgba(255,255,255,0.3); font-size:0.78rem; padding:20px 10px;">No friends added yet.<br><span style="font-size:0.7rem;">Open the Friends panel to add friends.</span></div>`;
        } else {
          friendsGrid.innerHTML = realFriends.map((f, idx) => {
            const initial = (f.username || 'G')[0].toUpperCase();
            const isSelected = (focusedRow === 0 && idx === focusedCol && activeProfileView === 'hub');
            return `
              <div class="profile-friend-card ${isSelected ? 'selected' : ''}" data-friend-uid="${f.uid}" tabindex="0">
                <div class="profile-friend-card-content">
                  <div class="profile-friend-avatar-wrap">
                    ${initial}
                    <span class="profile-friend-presence-dot ${f.online ? 'online' : ''}"></span>
                  </div>
                  <div class="profile-friend-details">
                    <div class="profile-friend-card-name">${f.username}</div>
                    <div class="profile-friend-h2h" style="color:${f.online ? '#34d399' : 'rgba(255,255,255,0.35)'}">${f.online ? (f.activity || 'Online') : 'Offline'}</div>
                  </div>
                </div>
              </div>
            `;
          }).join('');

          // Bind click listeners for friend cards
          const fCards = friendsGrid.querySelectorAll('.profile-friend-card');
          fCards.forEach((card, idx) => {
            card.onclick = () => {
              focusedRow = 0;
              focusedCol = idx;
              if (window.sounds && typeof window.sounds.play === 'function') window.sounds.play('click');
            };
          });
        }
      }

      // 6c. Render achievement percentages + REAL playtime for game cards
      const gametime = profile.gametime || {};
      const hoursMap = { cricket: 'cricket', f1: 'f1', mortal: 'wwe' };
      PROFILE_GAMES.forEach(key => {
        // Achievement %
        const list = GAME_ACHIEVEMENTS[key];
        const unlocked2 = profile.achievements || [];
        const unlockedCount = list.filter(a => unlocked2.includes(a.id)).length;
        const pct = list.length > 0 ? Math.round((unlockedCount / list.length) * 100) : 0;
        const pctEl = document.getElementById(`profile-ach-pct-${key}`);
        if (pctEl) pctEl.textContent = `${pct}% Achievements`;

        // Real playtime (stored as seconds in Firestore under gametime.<gameKey>)
        const gtKey = hoursMap[key] || key;
        const secs = gametime[gtKey] || 0;
        const hrs = (secs / 3600).toFixed(1);
        const hoursEl = document.getElementById(`profile-hours-${key}`);
        if (hoursEl) hoursEl.textContent = `${hrs} hrs`;
      });

      // 6d. Sync game library selections and bind click listeners
      const gameCards = document.querySelectorAll('#ps5-profile-modal .profile-game-card');
      gameCards.forEach((card, idx) => {
        const key = card.getAttribute('data-game-key');
        const isSelected = (focusedRow === 1 && idx === focusedCol && activeProfileView === 'hub');

        if (isSelected) {
          card.classList.add('selected');
        } else {
          card.classList.remove('selected');
        }

        card.onclick = () => {
          focusedRow = 1;
          focusedCol = idx;
          showGameDetails(key);
          if (window.sounds && typeof window.sounds.play === 'function') window.sounds.play('click');
        };
      });

      // 6e. Bind details back buttons
      const pvpBackBtn = document.getElementById('profile-pvp-back-btn');
      if (pvpBackBtn) {
        pvpBackBtn.onclick = () => {
          showHubView();
          if (window.sounds && typeof window.sounds.play === 'function') window.sounds.play('back');
        };
      }

      const gameBackBtn = document.getElementById('profile-details-back-btn');
      if (gameBackBtn) {
        gameBackBtn.onclick = () => {
          showHubView();
          if (window.sounds && typeof window.sounds.play === 'function') window.sounds.play('back');
        };
      }
    }

    // 7. Store Balance
    const storeCoins = document.getElementById('ps5-store-coins-val');
    if (storeCoins) {
      storeCoins.textContent = `${profile.coins || 0} Coins`;
    }
    if (typeof window.updateStoreButtonsState === 'function') {
      window.updateStoreButtonsState();
    }

    // 8. Friends UI Sync
    if (window.friendsManager && typeof window.friendsManager.syncFriendsUI === 'function') {
      window.friendsManager.syncFriendsUI();
    }
  };

  const MOCK_FRIENDS = []; // Removed — only real friends from Firestore shown now

  function generatePvpMatchesForFriend(friend) {
    const seed = friend.uid || 'default';
    let seedNum = 0;
    for (let i = 0; i < seed.length; i++) {
      seedNum += seed.charCodeAt(i);
    }
    const random = () => {
      const x = Math.sin(seedNum++) * 10000;
      return x - Math.floor(x);
    };

    const games = ['Cricket Pro', 'Formula 1 Racer', 'Mortal Combat'];
    const outcomes = ['won', 'lost'];
    const cricketDetails = [
      { text: 'Won by 14 runs', myScore: '124/4 (5 ov)', oppScore: '110/6 (5 ov)' },
      { text: 'Lost by 3 wickets', myScore: '86/10 (4.2 ov)', oppScore: '90/7 (4.5 ov)' },
      { text: 'Won by 5 wickets', myScore: '105/5 (4.5 ov)', oppScore: '102/6 (5 ov)' },
      { text: 'Lost by 22 runs', myScore: '95/8 (5 ov)', oppScore: '117/3 (5 ov)' }
    ];
    const f1Details = [
      { text: 'Won by 1.25 seconds', myScore: '1m 24.32s', oppScore: '1m 25.57s' },
      { text: 'Lost by 0.45 seconds', myScore: '1m 22.80s', oppScore: '1m 22.35s' },
      { text: 'Won by 3.12 seconds', myScore: '1m 25.10s', oppScore: '1m 28.22s' }
    ];
    const mortalDetails = [
      { text: 'Won by 2 rounds (2-1)', myScore: '2 Rounds', oppScore: '1 Round' },
      { text: 'Lost by 2 rounds (0-2)', myScore: '0 Rounds', oppScore: '2 Rounds' },
      { text: 'Won by Flawless (2-0)', myScore: '2 Rounds', oppScore: '0 Rounds' }
    ];

    const matchesCount = 4 + Math.floor(random() * 4); // 4 to 7 matches
    const matches = [];
    
    const dates = [
      'Today, Jul 4',
      'Yesterday, Jul 3',
      'Jul 2, 2026',
      'Jun 30, 2026',
      'Jun 28, 2026',
      'Jun 25, 2026',
      'Jun 20, 2026'
    ];

    for (let i = 0; i < matchesCount; i++) {
      const date = dates[i % dates.length];
      const gameIdx = Math.floor(random() * games.length);
      const game = games[gameIdx];
      const outcome = outcomes[Math.floor(random() * outcomes.length)];
      
      let detailObj;
      if (game === 'Cricket Pro') {
        const matchingDetails = cricketDetails.filter(d => d.text.toLowerCase().includes(outcome === 'won' ? 'won' : 'lost'));
        detailObj = matchingDetails[Math.floor(random() * matchingDetails.length)];
      } else if (game === 'Formula 1 Racer') {
        const matchingDetails = f1Details.filter(d => d.text.toLowerCase().includes(outcome === 'won' ? 'won' : 'lost'));
        detailObj = matchingDetails[Math.floor(random() * matchingDetails.length)];
      } else {
        const matchingDetails = mortalDetails.filter(d => d.text.toLowerCase().includes(outcome === 'won' ? 'won' : 'lost'));
        detailObj = matchingDetails[Math.floor(random() * matchingDetails.length)];
      }

      matches.push({
        id: `pvp_match_${seed}_${i}`,
        date,
        game,
        outcome,
        detail: detailObj.text,
        myScore: detailObj.myScore,
        oppScore: detailObj.oppScore
      });
    }

    return matches;
  }

  function updateCardSelectionVisuals() {
    // 1. Sync Friends Row (Row 0)
    const fCards = document.querySelectorAll('#ps5-profile-modal .profile-friend-card');
    fCards.forEach((card, idx) => {
      if (focusedRow === 0 && idx === focusedCol && activeProfileView === 'hub') {
        card.classList.add('selected');
        card.focus();
      } else {
        card.classList.remove('selected');
      }
    });

    // 2. Sync Games Row (Row 1)
    const gCards = document.querySelectorAll('#ps5-profile-modal .profile-game-card');
    gCards.forEach((card, idx) => {
      if (focusedRow === 1 && idx === focusedCol && activeProfileView === 'hub') {
        card.classList.add('selected');
        card.focus();
      } else {
        card.classList.remove('selected');
      }
    });
  }

  function showPvpDetails(friendUid) {
    selectedFriendUid = friendUid;
    activeProfileView = 'pvp_details';

    // Hide left profile panel
    const leftPanel = document.querySelector('#ps5-profile-modal .prf-left');
    if (leftPanel) leftPanel.style.display = 'none';

    // Toggle views
    const friendsView = document.getElementById('ps5-profile-friends-view');
    const pvpDetailsView = document.getElementById('ps5-profile-pvp-details-view');
    const gameDetailsView = document.getElementById('ps5-profile-details-view');
    if (friendsView) friendsView.style.display = 'none';
    if (gameDetailsView) gameDetailsView.style.display = 'none';
    if (pvpDetailsView) pvpDetailsView.style.display = 'block';

    const friend = currentDisplayFriends.find(f => f.uid === friendUid) || MOCK_FRIENDS[0];
    const profile = window.profile || {};
    const currentUser = window.currentUser || {};

    // 1. Populate VS Banner usernames & avatars
    const vsMeName = document.getElementById('vs-me-name');
    const vsMeAvatar = document.getElementById('vs-me-avatar');
    if (vsMeName) vsMeName.textContent = currentUser.displayName || profile.username || 'You';
    if (vsMeAvatar) {
      vsMeAvatar.innerHTML = currentUser.photoURL
        ? `<img src="${currentUser.photoURL}" alt="avatar">`
        : `👤`;
    }

    const vsThemName = document.getElementById('vs-them-name');
    const vsThemAvatar = document.getElementById('vs-them-avatar');
    if (vsThemName) vsThemName.textContent = friend.username;
    if (vsThemAvatar) {
      const initial = (friend.username || 'R')[0].toUpperCase();
      vsThemAvatar.innerHTML = `<span style="font-weight:900;">${initial}</span>`;
    }

    // 2. Generate head-to-head match history
    const matches = generatePvpMatchesForFriend(friend);
    const myWins = matches.filter(m => m.outcome === 'won').length;
    const oppWins = matches.length - myWins;

    // Update H2H progress bar and record text
    const recordText = document.getElementById('vs-record-text');
    if (recordText) recordText.textContent = `${myWins} - ${oppWins}`;

    const fillMe = document.getElementById('vs-fill-me');
    const fillThem = document.getElementById('vs-fill-them');
    const total = matches.length || 1;
    if (fillMe) fillMe.style.width = `${(myWins / total) * 100}%`;
    if (fillThem) fillThem.style.width = `${(oppWins / total) * 100}%`;

    // 3. Render Matches history card list
    const matchesContainer = document.getElementById('ps5-pvp-matches-list');
    if (matchesContainer) {
      matchesContainer.innerHTML = matches.map(m => {
        const isWon = m.outcome === 'won';
        const outcomeBadge = `<span class="pvp-outcome-badge ${m.outcome}">${m.outcome === 'won' ? 'Won' : 'Lost'}</span>`;
        const gameIcon = m.game === 'Cricket Pro' ? '🏏' : m.game === 'Formula 1 Racer' ? '🏁' : '🩸';
        
        return `
          <div class="prf-ach ${isWon ? 'unlocked' : ''}" style="margin-bottom: 8px;">
            <span class="prf-ach-icon">${gameIcon}</span>
            <div class="prf-ach-body" style="display: flex; align-items: center; justify-content: space-between; width: 100%; box-sizing: border-box; padding-right: 8px;">
              <div style="text-align: left; min-width: 0; flex: 1;">
                <div class="prf-ach-name">${m.game} • <span style="color: rgba(255,255,255,0.4); font-weight: normal; font-size: 0.65rem;">${m.date}</span></div>
                <div class="prf-ach-desc" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 320px;">
                  ${m.detail} (You: ${m.myScore} | Rival: ${m.oppScore})
                </div>
              </div>
              ${outcomeBadge}
            </div>
          </div>
        `;
      }).join('');
    }

    // 4. Rivalry quick stats panel
    const metaTotal = document.getElementById('vs-meta-total');
    const metaWinRatio = document.getElementById('vs-meta-winratio');
    const metaFavgame = document.getElementById('vs-meta-favgame');

    if (metaTotal) metaTotal.textContent = matches.length;
    if (metaWinRatio) metaWinRatio.textContent = `${Math.round((myWins / total) * 100)}%`;

    // Find favorite game
    const gameCounts = {};
    matches.forEach(m => {
      gameCounts[m.game] = (gameCounts[m.game] || 0) + 1;
    });
    let favGame = 'Cricket Pro';
    let maxCount = 0;
    for (const g in gameCounts) {
      if (gameCounts[g] > maxCount) {
        maxCount = gameCounts[g];
        favGame = g;
      }
    }
    if (metaFavgame) metaFavgame.textContent = favGame;
  }

  const GAME_INFO = {
    cricket: {
      title: 'Cricket Pro 2026',
      banner: '/cricket_card.png',
      playtime: null, // populated from real data
      lastplayed: null,
      developer: 'DeepMind Sports',
      publisher: 'PlaySphere Studios',
      genre: 'Sports / Simulation'
    },
    f1: {
      title: 'Formula 1 Racer',
      banner: '/f1_card.svg',
      playtime: null,
      lastplayed: null,
      developer: 'PlaySphere Racing',
      publisher: 'PlaySphere Studios',
      genre: 'Racing / Arcade'
    },
    mortal: {
      title: 'WWE Chibi Rumble',
      banner: '/wwe_card.svg',
      playtime: null,
      lastplayed: null,
      developer: 'PlaySphere Arcade',
      publisher: 'PlaySphere Studios',
      genre: 'Fighting / Action'
    }
  };

  const GAME_ACHIEVEMENTS = {
    cricket: [
      { id: 'first_boundary', name: 'First Boundary', desc: 'Hit a 4 or a 6 in a match', icon: '🎯' },
      { id: 'sixer_master', name: 'Sixer Master', desc: 'Hit a massive 6 into the crowd', icon: '🚀' },
      { id: 'clean_bowled', name: 'Clean Bowled', desc: 'Bowl out an opponent batsman', icon: '🏏' },
      { id: 'spectacular_catch', name: 'Spectacular Catch', desc: 'Take a catch via QTE dial', icon: '🤲' },
      { id: 'run_out', name: 'Crease Run Out', desc: 'Successfully run out a batsman', icon: '⚡' },
      { id: 'match_winner', name: 'Match Winner', desc: 'Successfully win a custom match', icon: '🏆' }
    ],
    f1: [
      { id: 'pole_position', name: 'Pole Position', desc: 'Qualify first on the starting grid', icon: '⏱️' },
      { id: 'fastest_lap', name: 'Speed Demon', desc: 'Set the fastest lap in a race', icon: '🔥' },
      { id: 'podium_finish', name: 'Podium Master', desc: 'Finish a race in the top 3', icon: '🏁' },
      { id: 'world_champion', name: 'World Champion', desc: 'Win the Formula 1 Championship', icon: '👑' }
    ],
    mortal: [
      { id: 'first_blood', name: 'First Blood', desc: 'Win your first round in a fight', icon: '🩸' },
      { id: 'flawless_victory', name: 'Flawless Victory', desc: 'Win a round without taking damage', icon: '🛡️' },
      { id: 'fatality', name: 'Finish Him!', desc: 'Perform a finishing move on an opponent', icon: '💀' },
      { id: 'champion_of_realms', name: 'Realm Champion', desc: 'Defeat the final boss in Arcade Mode', icon: '👹' }
    ]
  };

  function showGameDetails(gameKey) {
    selectedGameKey = gameKey;
    activeProfileView = 'game_details';

    // Hide left profile panel
    const leftPanel = document.querySelector('#ps5-profile-modal .prf-left');
    if (leftPanel) leftPanel.style.display = 'none';

    // Toggle views
    const friendsView = document.getElementById('ps5-profile-friends-view');
    const gameDetailsView = document.getElementById('ps5-profile-details-view');
    const pvpDetailsView = document.getElementById('ps5-profile-pvp-details-view');
    if (friendsView) friendsView.style.display = 'none';
    if (pvpDetailsView) pvpDetailsView.style.display = 'none';
    if (gameDetailsView) gameDetailsView.style.display = 'block';

    // Populate metadata details
    const info = GAME_INFO[gameKey] || GAME_INFO.cricket;
    const titleEl = document.getElementById('profile-hero-title');
    const imgEl = document.getElementById('profile-hero-img');
    const playtimeEl = document.getElementById('profile-hero-playtime');
    const lastplayedEl = document.getElementById('profile-hero-lastplayed');
    const devEl = document.getElementById('profile-meta-developer');
    const pubEl = document.getElementById('profile-meta-publisher');
    const genreEl = document.getElementById('profile-meta-genre');

    if (titleEl) titleEl.textContent = info.title;
    if (imgEl) imgEl.src = info.banner;

    // Real playtime from Firestore
    const gtKeyMap = { cricket: 'cricket', f1: 'f1', mortal: 'wwe' };
    const gametime = (window.profile && window.profile.gametime) || {};
    const secs = gametime[gtKeyMap[gameKey] || gameKey] || 0;
    const realHrs = (secs / 3600).toFixed(1);
    if (playtimeEl) playtimeEl.textContent = `${realHrs} hrs`;

    // Last played: derive from lastPlayedAt.<gameKey> if available
    const lastPlayedMap = (window.profile && window.profile.lastPlayedAt) || {};
    const lastTs = lastPlayedMap[gtKeyMap[gameKey] || gameKey];
    if (lastplayedEl) {
      if (lastTs) {
        const d = new Date(lastTs);
        const now = new Date();
        const diffDays = Math.floor((now - d) / 86400000);
        lastplayedEl.textContent = diffDays === 0 ? 'Today' : diffDays === 1 ? 'Yesterday' : `${diffDays} days ago`;
      } else {
        lastplayedEl.textContent = secs > 0 ? 'Recently' : 'Never played';
      }
    }
    if (devEl) devEl.textContent = info.developer;
    if (pubEl) pubEl.textContent = info.publisher;
    if (genreEl) genreEl.textContent = info.genre;

    // Render achievements details
    const profile = window.profile || {};
    const unlocked = profile.achievements || [];
    const achievementsList = GAME_ACHIEVEMENTS[gameKey] || GAME_ACHIEVEMENTS.cricket;
    const unlockedCount = achievementsList.filter(a => unlocked.includes(a.id)).length;

    const achCountEl = document.getElementById('profile-hero-ach-count');
    if (achCountEl) achCountEl.textContent = `${unlockedCount} / ${achievementsList.length}`;

    renderPlaySphereAchievementsGrid(gameKey);
  }

  function renderPlaySphereAchievementsGrid(gameKey = 'cricket') {
    const container = document.getElementById('ps5-ach-list-details');
    if (!container) return;

    const profile = window.profile || {};
    const unlocked = profile.achievements || [];
    const achievementsList = GAME_ACHIEVEMENTS[gameKey] || GAME_ACHIEVEMENTS.cricket;

    container.innerHTML = achievementsList.map(a => {
      const isUnlocked = unlocked.includes(a.id);
      const icon = a.icon || '🏆';
      return `
        <div class="prf-ach ${isUnlocked ? 'unlocked' : ''}">
          <span class="prf-ach-icon">${icon}</span>
          <div class="prf-ach-body">
            <div class="prf-ach-name">${a.name}</div>
            <div class="prf-ach-desc">${a.desc}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  function showHubView() {
    activeProfileView = 'hub';

    // Restore left profile panel
    const leftPanel = document.querySelector('#ps5-profile-modal .prf-left');
    if (leftPanel) leftPanel.style.display = 'flex';

    // Toggle views
    const friendsView = document.getElementById('ps5-profile-friends-view');
    const pvpDetailsView = document.getElementById('ps5-profile-pvp-details-view');
    const gameDetailsView = document.getElementById('ps5-profile-details-view');
    if (friendsView) friendsView.style.display = 'block';
    if (pvpDetailsView) pvpDetailsView.style.display = 'none';
    if (gameDetailsView) gameDetailsView.style.display = 'none';

    updateCardSelectionVisuals();
  }

  window.resetPlaySphereProfileView = function() {
    showHubView();
    focusedRow = 0;
    focusedCol = 0;
  };

  // Keyboard navigation listener inside modal
  window.addEventListener('keydown', (e) => {
    const profModal = document.getElementById('ps5-profile-modal');
    if (!profModal || !profModal.classList.contains('show')) return;
    if (!window.currentUser || window.profileNeedsComplete) return;

    if (activeProfileView === 'hub') {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        // 3 items in friends and 3 items in games grid
        focusedCol = (focusedCol - 1 + 3) % 3;
        updateCardSelectionVisuals();
        if (window.sounds && typeof window.sounds.play === 'function') window.sounds.play('navigate');
      }
      else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault();
        focusedCol = (focusedCol + 1) % 3;
        updateCardSelectionVisuals();
        if (window.sounds && typeof window.sounds.play === 'function') window.sounds.play('navigate');
      }
      else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        if (focusedRow === 1) {
          focusedRow = 0;
          updateCardSelectionVisuals();
          if (window.sounds && typeof window.sounds.play === 'function') window.sounds.play('navigate');
        }
      }
      else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        if (focusedRow === 0) {
          focusedRow = 1;
          updateCardSelectionVisuals();
          if (window.sounds && typeof window.sounds.play === 'function') window.sounds.play('navigate');
        }
      }
      else if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        if (focusedRow === 0) {
          // Open Friend PvP Matchups page
          if (currentDisplayFriends.length > 0) {
            const friend = currentDisplayFriends[focusedCol];
            showPvpDetails(friend.uid);
            if (window.sounds && typeof window.sounds.play === 'function') window.sounds.play('click');
          }
        } else if (focusedRow === 1) {
          // Open Game Achievements page
          const key = PROFILE_GAMES[focusedCol];
          showGameDetails(key);
          if (window.sounds && typeof window.sounds.play === 'function') window.sounds.play('click');
        }
      }
    } else if (activeProfileView === 'pvp_details' || activeProfileView === 'game_details') {
      if (e.code === 'Escape' || e.code === 'Backspace') {
        e.preventDefault();
        showHubView();
        if (window.sounds && typeof window.sounds.play === 'function') window.sounds.play('back');
      }
    }
  });

})();


