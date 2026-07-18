/**
 * PlaySphere Friends Hub Modal Component Logic
 */

class PlaySphereFriendsManager {
  constructor() {
    this.modal = null;
    this.listContainer = null;
    this.requestsSection = null;
    this.requestsList = null;
    this.searchInput = null;
    this.searchResult = null;
    this.myUsernameDisplay = null;
    this.friendsBadge = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    
    this.modal = document.getElementById('ps5-friends-modal');
    this.listContainer = document.getElementById('ps5-friends-list-container');
    this.requestsSection = document.getElementById('ps5-friend-requests-section');
    this.requestsList = document.getElementById('ps5-friend-requests-list');
    this.searchInput = document.getElementById('ps5-friend-search-input');
    this.searchResult = document.getElementById('ps5-friend-search-result');
    this.myUsernameDisplay = document.getElementById('ps5-my-username-display');
    this.friendsBadge = document.getElementById('ps5-friends-badge');

    // Trigger buttons
    const trigger = document.getElementById('ps5-friends-trigger');
    const closeBtn = document.getElementById('ps5-friends-close-btn');

    if (trigger) {
      trigger.onclick = () => this.openFriendsModal();
    }
    if (closeBtn) {
      closeBtn.onclick = () => this.closeFriendsModal();
    }

    // Modal click-outside handler
    if (this.modal) {
      this.modal.onclick = (e) => {
        if (e.target === this.modal) this.closeFriendsModal();
      };
    }

    // Search action binding
    const searchBtn = document.getElementById('ps5-friend-search-btn');
    if (searchBtn && this.searchInput) {
      searchBtn.onclick = () => this.handleSearch();
      this.searchInput.onkeydown = (e) => {
        if (e.key === 'Enter') this.handleSearch();
      };
    }

    // Copy Username binding
    const copyBtn = document.getElementById('ps5-copy-username-btn');
    if (copyBtn) {
      copyBtn.onclick = () => this.handleCopyUsername();
    }

    // Bind Socket.io response
    if (window.socket) {
      window.socket.on('friends-presence-response', (presenceMap) => {
        this.renderFriendsWithPresence(presenceMap);
      });
      window.socket.on('presence-changed', () => {
        // Refresh presence if modal is currently open
        if (this.modal && this.modal.classList.contains('show')) {
          this.fetchFriendsPresence();
        }
      });
    }

    this.initialized = true;
    console.log("PlaySphere Friends Manager Initialized.");
  }

  openFriendsModal() {
    console.log("[Friends Modal] openFriendsModal called. modal element:", this.modal);
    if (!this.modal) {
      console.warn("[Friends Modal] modal element is NULL!");
      return;
    }
    this.modal.style.display = '';
    this.modal.classList.add('show');
    console.log("[Friends Modal] Added 'show' class to modal. ClassList:", this.modal.className);
    this.syncFriendsUI();
  }

  closeFriendsModal() {
    if (!this.modal) return;
    this.modal.classList.remove('show');
  }

  async syncFriendsUI() {
    if (!window.currentUser || window.profileNeedsComplete) {
      if (this.listContainer) {
        this.listContainer.innerHTML = `<div style="text-align:center; color:rgba(255,255,255,0.4); padding-top:60px; font-size:0.85rem;">Please sign in to access friends.</div>`;
      }
      if (this.myUsernameDisplay) this.myUsernameDisplay.textContent = 'Guest';
      if (this.requestsSection) this.requestsSection.classList.add('hidden');
      return;
    }

    const profile = window.profile || {};
    if (this.myUsernameDisplay) {
      this.myUsernameDisplay.textContent = profile.username || 'Gamer';
    }

    // Sync incoming friend invites list
    const incoming = profile.friendRequestsReceived || [];
    if (incoming.length > 0) {
      if (this.requestsSection) this.requestsSection.classList.remove('hidden');
      if (this.friendsBadge) this.friendsBadge.classList.remove('hidden');
      
      const reqProfiles = await window.friendsLoadProfiles(incoming);
      if (this.requestsList) {
        this.requestsList.innerHTML = reqProfiles.map(p => `
          <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(0,0,0,0.2); padding:6px 10px; border-radius:6px;">
            <span style="font-weight:700; color:#fff; font-size:0.8rem;">${p.username}</span>
            <div style="display:flex; gap:6px;">
              <button onclick="window.friendsManager.acceptInvite('${p.uid}')" style="background:#10b981; border:none; border-radius:4px; color:#fff; font-size:0.7rem; font-weight:700; padding:2px 8px; cursor:pointer;">Accept</button>
              <button onclick="window.friendsManager.declineInvite('${p.uid}')" style="background:#ef4444; border:none; border-radius:4px; color:#fff; font-size:0.7rem; font-weight:700; padding:2px 8px; cursor:pointer;">Decline</button>
            </div>
          </div>
        `).join('');
      }
    } else {
      if (this.requestsSection) this.requestsSection.classList.add('hidden');
      if (this.friendsBadge) this.friendsBadge.classList.add('hidden');
    }

    // Trigger friends status listing
    await this.fetchFriendsPresence();
  }

  async fetchFriendsPresence() {
    const profile = window.profile || {};
    const friendUids = profile.friends || [];

    if (friendUids.length === 0) {
      if (this.listContainer) {
        this.listContainer.innerHTML = `<div style="text-align:center; color:rgba(255,255,255,0.4); padding-top:60px; font-size:0.85rem;">No friends added yet.<br><span style="font-size:0.75rem; color:rgba(255,255,255,0.25);">Use the search above to find friends.</span></div>`;
      }
      return;
    }

    // Load friend profiles from Firestore
    this.activeFriendProfiles = await window.friendsLoadProfiles(friendUids);

    // Render immediately using last known presence (or show as loading)
    const lastMap = this._lastPresenceMap || {};
    this.renderFriendsWithPresence(lastMap);

    // Then ask server for fresh presence — socket reply will re-render with real status
    if (window.socket) {
      window.socket.emit('get-friends-presence', { friendUids });
    }
  }

  renderFriendsWithPresence(presenceMap) {
    if (!this.activeFriendProfiles || this.activeFriendProfiles.length === 0) return;

    // Store presence map so in-game ps_multiplayer.js panels can read it
    this._lastPresenceMap = presenceMap;

    if (this.listContainer) {
      this.listContainer.innerHTML = this.activeFriendProfiles.map(p => {
        const presence = presenceMap[p.uid] || { online: false, activity: 'Offline', roomCode: null };
        const avatarChar = (p.username || 'G')[0].toUpperCase();
        const safeUsername = (p.username || 'Player').replace(/'/g, '');
        return `
          <div class="friend-row" style="display:flex; align-items:center; justify-content:space-between; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.04); border-radius:8px; padding:10px 12px; box-sizing:border-box; gap:8px;">
            <div style="display:flex; align-items:center; gap:10px; flex:1; min-width:0;">
              <div style="position:relative; width:34px; height:34px; border-radius:50%; background:#2563eb; display:flex; align-items:center; justify-content:center; font-weight:700; color:#fff; font-size:0.95rem; font-family:inherit; flex-shrink:0;">
                ${avatarChar}
                <span style="position:absolute; bottom:-1px; right:-1px; width:10px; height:10px; border-radius:50%; border:2px solid #1e293b; background:${presence.online ? '#10b981' : '#6b7280'}; box-shadow:${presence.online ? '0 0 6px #10b981' : 'none'};"></span>
              </div>
              <div style="display:flex; flex-direction:column; gap:2px; text-align:left; overflow:hidden;">
                <span style="font-weight:700; color:#fff; font-size:0.85rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${p.username}</span>
                <span style="font-size:0.7rem; color:${presence.online ? '#34d399' : '#94a3b8'}; font-weight:600;">
                  ${presence.online ? (presence.activity || 'Online') : 'Offline'}
                </span>
              </div>
            </div>
            <div style="display:flex; flex-direction:column; gap:5px; flex-shrink:0;">
              ${presence.online && presence.roomCode ? `
                <button onclick="window.friendsManager.joinGame('${presence.roomCode}')" style="background:#10b981; border:none; border-radius:4px; color:#fff; font-size:0.65rem; font-weight:700; padding:3px 8px; cursor:pointer; font-family:inherit; transition: background 0.2s;">JOIN GAME</button>
              ` : ''}
              ${presence.online ? `
                <button onclick="window.friendsManager.sendChallenge('${p.uid}','${safeUsername}')" style="background:linear-gradient(135deg,#0ea5e9,#2563eb); border:none; border-radius:4px; color:#fff; font-size:0.65rem; font-weight:700; padding:3px 8px; cursor:pointer; font-family:inherit; white-space:nowrap;">⚔️ CHALLENGE</button>
              ` : ''}
            </div>
          </div>
        `;
      }).join('');
    }
  }

  async handleSearch() {
    if (!this.searchInput || !this.searchResult) return;
    const name = this.searchInput.value.trim();
    if (!name) return;

    this.searchResult.innerHTML = `<span style="font-size:0.75rem; color:#94a3b8;">Searching...</span>`;

    try {
      const found = await window.friendsSearchUser(name);
      if (!found) {
        this.searchResult.innerHTML = `<span style="font-size:0.75rem; color:#ef4444;">User not found.</span>`;
        return;
      }

      if (found.uid === window.currentUser.uid) {
        this.searchResult.innerHTML = `<span style="font-size:0.75rem; color:#ef4444;">You cannot add yourself.</span>`;
        return;
      }

      const profile = window.profile || {};
      const friends = profile.friends || [];
      const sent = profile.friendRequestsSent || [];
      
      let actionBtn = '';
      if (friends.includes(found.uid)) {
        actionBtn = `<span style="font-size:0.75rem; color:#10b981; font-weight:700;">Already Friends</span>`;
      } else if (sent.includes(found.uid)) {
        actionBtn = `<span style="font-size:0.75rem; color:#60a5fa; font-weight:700;">Request Sent</span>`;
      } else {
        actionBtn = `<button onclick="window.friendsManager.sendInvite('${found.uid}')" style="background:#2563eb; border:none; border-radius:4px; color:#fff; font-size:0.7rem; font-weight:700; padding:4px 10px; cursor:pointer;">Add Friend</button>`;
      }

      this.searchResult.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); padding:8px 10px; border-radius:6px; margin-top:4px;">
          <span style="font-weight:700; color:#fff; font-size:0.8rem;">${found.username}</span>
          ${actionBtn}
        </div>
      `;
    } catch (e) {
      console.error(e);
      this.searchResult.innerHTML = `<span style="font-size:0.75rem; color:#ef4444;">Search failed.</span>`;
    }
  }

  async sendInvite(uid) {
    try {
      await window.friendsSendRequest(uid);
      
      // Update local profile representation
      window.profile.friendRequestsSent = window.profile.friendRequestsSent || [];
      window.profile.friendRequestsSent.push(uid);
      
      this.handleSearch(); // refresh button state
      console.log("Friend request sent successfully.");
    } catch (err) {
      console.error(err);
    }
  }

  async acceptInvite(uid) {
    try {
      await window.friendsAcceptRequest(uid);

      // Update local profile state
      window.profile.friends = window.profile.friends || [];
      if (!window.profile.friends.includes(uid)) window.profile.friends.push(uid);
      window.profile.friendRequestsReceived = (window.profile.friendRequestsReceived || []).filter(id => id !== uid);

      await this.syncFriendsUI(); // re-render the requests panel
      await this.fetchFriendsPresence(); // immediately load the new friend and their online status
      console.log('Friend request accepted.');
    } catch (err) {
      console.error(err);
    }
  }

  async declineInvite(uid) {
    try {
      await window.friendsDeclineRequest(uid);
      
      window.profile.friendRequestsReceived = window.profile.friendRequestsReceived || [];
      window.profile.friendRequestsReceived = window.profile.friendRequestsReceived.filter(id => id !== uid);

      this.syncFriendsUI();
      console.log("Friend request declined.");
    } catch (err) {
      console.error(err);
    }
  }

  handleCopyUsername() {
    const profile = window.profile || {};
    const username = profile.username || 'Gamer';
    navigator.clipboard.writeText(username).then(() => {
      const btn = document.getElementById('ps5-copy-username-btn');
      if (btn) {
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
      }
    });
  }

  joinGame(roomCode) {
    if (!roomCode) return;
    this.closeFriendsModal();
    
    // Auto-fill and route to join friend as their gamepad controller
    const url = `${window.location.origin}/controller.html?room=${roomCode}`;
    window.open(url, '_blank');
    
    console.log(`Launching controller layout to join room: ${roomCode}`);
  }

  sendChallenge(toUid, toUsername) {
    if (!window.socket) { this._showGamePicker(null, null, 'Not connected to server.'); return; }
    if (!window.currentUser) { this._showGamePicker(null, null, 'Please sign in first.'); return; }
    this._showGamePicker(toUid, toUsername);
  }

  _showGamePicker(toUid, toUsername, errorMsg) {
    // Remove any existing picker
    const old = document.getElementById('ps-game-picker-overlay');
    if (old) old.remove();

    const GAMES = [
      { id: 'cricket',  label: 'Cricket Pro 2026', emoji: '🏏', color: '#16a34a', desc: 'Sports / Simulation' },
      { id: 'fps',      label: 'Delhi Defiance',   emoji: '🔫', color: '#dc2626', desc: 'Tactical FPS' },
      { id: 'football', label: 'Football Pro',     emoji: '⚽', color: '#2563eb', desc: 'Sports / Arcade' },
      { id: 'f1',       label: 'Apex Stars F1',    emoji: '🏎️', color: '#f59e0b', desc: 'Racing / Arcade' },
      { id: 'tennis',   label: 'Chibi Tennis',     emoji: '🎾', color: '#0891b2', desc: 'Sports / Arcade' },
      { id: 'wwe',      label: 'WWE Chibi Rumble', emoji: '🥊', color: '#9333ea', desc: 'Fighting / Action' },
    ];

    const overlay = document.createElement('div');
    overlay.id = 'ps-game-picker-overlay';
    overlay.style.cssText = `
      position:fixed; inset:0; z-index:999999;
      background:rgba(2,6,23,0.92); backdrop-filter:blur(20px);
      display:flex; align-items:center; justify-content:center;
      animation:ps-picker-fade 0.25s ease;
    `;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes ps-picker-fade { from{opacity:0;transform:scale(0.96)} to{opacity:1;transform:scale(1)} }
      @keyframes ps-card-in { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
      .ps-gp-card {
        background:rgba(255,255,255,0.04); border:1.5px solid rgba(255,255,255,0.08);
        border-radius:14px; padding:18px 16px; cursor:pointer; text-align:center;
        transition:all 0.2s cubic-bezier(0.34,1.56,0.64,1); position:relative; overflow:hidden;
        animation:ps-card-in 0.3s ease both;
      }
      .ps-gp-card:hover {
        transform:translateY(-4px) scale(1.04);
        border-color:rgba(255,255,255,0.25);
        box-shadow:0 12px 40px rgba(0,0,0,0.5);
      }
      .ps-gp-card:hover .ps-gp-glow { opacity:1; }
      .ps-gp-glow {
        position:absolute; inset:0; opacity:0;
        transition:opacity 0.2s;
        border-radius:14px;
      }
    `;
    document.head.appendChild(style);

    overlay.innerHTML = `
      <div style="max-width:600px; width:90%; font-family:'Inter','Segoe UI',sans-serif;">
        <div style="text-align:center; margin-bottom:24px;">
          <div style="font-size:0.75rem; text-transform:uppercase; letter-spacing:3px; color:#6366f1; font-weight:800; margin-bottom:6px;">⚔️ CHALLENGE</div>
          <div style="font-size:1.5rem; font-weight:900; color:#f8fafc;">${toUsername ? `Challenge <span style='color:#a5b4fc'>${toUsername}</span>` : 'Select a Game'}</div>
          <div style="font-size:0.78rem; color:rgba(255,255,255,0.4); margin-top:4px;">Pick which game to play</div>
          ${errorMsg ? `<div style="margin-top:10px; background:rgba(239,68,68,0.15); border:1px solid rgba(239,68,68,0.3); border-radius:8px; padding:8px 14px; color:#fca5a5; font-size:0.78rem;">${errorMsg}</div>` : ''}
        </div>
        <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:12px;" id="ps-gp-grid"></div>
        <div style="text-align:center; margin-top:20px;">
          <button id="ps-gp-cancel" style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); border-radius:8px; color:rgba(255,255,255,0.5); font-size:0.8rem; font-weight:700; padding:10px 28px; cursor:pointer; font-family:inherit; transition:background 0.2s;">Cancel</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Populate game cards
    const grid = document.getElementById('ps-gp-grid');
    GAMES.forEach((g, i) => {
      const card = document.createElement('div');
      card.className = 'ps-gp-card';
      card.style.animationDelay = `${i * 0.05}s`;
      card.innerHTML = `
        <div class="ps-gp-glow" style="background:radial-gradient(circle at 50% 50%, ${g.color}22, transparent 70%);"></div>
        <div style="font-size:2.2rem; margin-bottom:10px; line-height:1;">${g.emoji}</div>
        <div style="font-weight:800; color:#f8fafc; font-size:0.82rem; margin-bottom:4px;">${g.label}</div>
        <div style="font-size:0.65rem; color:rgba(255,255,255,0.35); font-weight:600;">${g.desc}</div>
        <div style="margin-top:10px; background:${g.color}; border-radius:6px; font-size:0.65rem; font-weight:800; color:#fff; padding:4px 0;">CHALLENGE</div>
      `;
      card.onclick = () => {
        overlay.remove();
        if (toUid) {
          const fromUsername = (window.profile && window.profile.username) || 'Player';
          window.socket.emit('ps-challenge-send', { toUid, game: g.id, fromUsername });
          this.closeFriendsModal();
          // Show a small confirmation
          this._showChallengeConfirm(g.emoji, g.label, toUsername);
          console.log(`[Challenge] Sent ${g.id} challenge to ${toUsername}`);
        }
      };
      grid.appendChild(card);
    });

    // Cancel
    document.getElementById('ps-gp-cancel').onclick = () => overlay.remove();
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  }

  _showChallengeConfirm(emoji, gameLabel, toUsername) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position:fixed; bottom:28px; left:50%; transform:translateX(-50%);
      z-index:999998; background:rgba(10,15,30,0.97);
      border:1px solid rgba(99,102,241,0.5); border-radius:12px;
      padding:14px 22px; display:flex; align-items:center; gap:12px;
      font-family:'Inter','Segoe UI',sans-serif;
      box-shadow:0 0 40px rgba(99,102,241,0.2), 0 16px 40px rgba(0,0,0,0.6);
      animation:ps-toast-in2 0.35s cubic-bezier(0.34,1.56,0.64,1);
      white-space:nowrap;
    `;
    toast.innerHTML = `
      <span style="font-size:1.6rem;">${emoji}</span>
      <div>
        <div style="font-weight:800; color:#f1f5f9; font-size:0.82rem;">Challenge Sent!</div>
        <div style="font-size:0.7rem; color:rgba(255,255,255,0.4);">${gameLabel} → ${toUsername}</div>
      </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0'; toast.style.transform = 'translateX(-50%) translateY(20px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
}

// Instantiate and expose globally
window.friendsManager = new PlaySphereFriendsManager();

// reinit() always rebinds - safe to call multiple times
PlaySphereFriendsManager.prototype.reinit = function() {
  this.initialized = false;
  this.init();
};

// ── Auto-init: called after DOM is fully ready ───────────────────────────────
// Components are loaded synchronously via document.write in index.html,
// so DOMContentLoaded fires AFTER all component HTML is in the DOM.
// This is why init() must wait for DOMContentLoaded — not be called inline.
function initFriendsWhenReady() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.friendsManager.init());
  } else {
    window.friendsManager.init();
  }
  // Also re-bind socket events once socket becomes available (socket init happens later)
  const tryBindSocket = () => {
    if (window.socket) {
      if (!window.socket._friendsModalBound) {
        window.socket._friendsModalBound = true;
        window.socket.on('friends-presence-response', (presenceMap) => {
          window.friendsManager.renderFriendsWithPresence(presenceMap);
        });
        window.socket.on('presence-changed', () => {
          const m = window.friendsManager.modal;
          if (m && m.classList.contains('show')) window.friendsManager.fetchFriendsPresence();
        });
      }
    } else {
      setTimeout(tryBindSocket, 600);
    }
  };
  tryBindSocket();
}

initFriendsWhenReady();
