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
    if (!this.modal) return;
    this.modal.style.display = '';
    this.modal.classList.add('show');
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
        this.listContainer.innerHTML = `<div style="text-align:center; color:rgba(255,255,255,0.4); padding-top:60px; font-size:0.85rem;">No friends added yet.</div>`;
      }
      return;
    }

    // Load friend database profiles
    this.activeFriendProfiles = await window.friendsLoadProfiles(friendUids);

    // Ask Node server for real-time presence data
    if (window.socket) {
      window.socket.emit('get-friends-presence', { friendUids });
    }
  }

  renderFriendsWithPresence(presenceMap) {
    if (!this.activeFriendProfiles || this.activeFriendProfiles.length === 0) return;

    if (this.listContainer) {
      this.listContainer.innerHTML = this.activeFriendProfiles.map(p => {
        const presence = presenceMap[p.uid] || { online: false, activity: 'Offline', roomCode: null };
        const avatarChar = (p.username || 'G')[0].toUpperCase();
        return `
          <div class="friend-row" style="display:flex; align-items:center; justify-content:space-between; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.04); border-radius:8px; padding:10px 12px; box-sizing:border-box;">
            <div style="display:flex; align-items:center; gap:10px;">
              <div style="position:relative; width:34px; height:34px; border-radius:50%; background:#2563eb; display:flex; align-items:center; justify-content:center; font-weight:700; color:#fff; font-size:0.95rem; font-family:inherit;">
                ${avatarChar}
                <span style="position:absolute; bottom:-1px; right:-1px; width:10px; height:10px; border-radius:50%; border:2px solid #1e293b; background:${presence.online ? '#10b981' : '#6b7280'}; box-shadow:${presence.online ? '0 0 6px #10b981' : 'none'};"></span>
              </div>
              <div style="display:flex; flex-direction:column; gap:2px; text-align:left;">
                <span style="font-weight:700; color:#fff; font-size:0.85rem;">${p.username}</span>
                <span style="font-size:0.7rem; color:${presence.online ? '#34d399' : '#94a3b8'}; font-weight:600;">
                  ${presence.online ? (presence.activity || 'Online') : 'Offline'}
                </span>
              </div>
            </div>
            ${presence.online && presence.roomCode ? `
              <button onclick="window.friendsManager.joinGame('${presence.roomCode}')" style="background:#10b981; border:none; border-radius:4px; color:#fff; font-size:0.7rem; font-weight:700; padding:4px 10px; cursor:pointer; font-family:inherit; transition: background 0.2s;">JOIN GAME</button>
            ` : ''}
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
      window.profile.friends.push(uid);
      
      window.profile.friendRequestsReceived = window.profile.friendRequestsReceived || [];
      window.profile.friendRequestsReceived = window.profile.friendRequestsReceived.filter(id => id !== uid);

      this.syncFriendsUI();
      console.log("Friend request accepted.");
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
}

// Instantiate and expose globally
window.friendsManager = new PlaySphereFriendsManager();

// reinit() always rebinds - safe to call multiple times
PlaySphereFriendsManager.prototype.reinit = function() {
  this.initialized = false;
  this.init();
};
