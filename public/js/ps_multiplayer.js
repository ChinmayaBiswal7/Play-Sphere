/**
 * ps_multiplayer.js
 * PlaySphere Universal Multiplayer Panel
 * Loaded inside every game iframe. Provides:
 *   - PVP tab: challenge a friend directly
 *   - MATCHMAKING tab: find random opponent for this game
 *
 * Reads window.currentUser, window.profile, window.socket (set by parent dashboard).
 * Emits ps-* socket events handled by server/pvpManager.js
 */

(function () {
  'use strict';

  // ── Detect which game we are inside ─────────────────────────────────────────
  const GAME_DETECT = {
    '/fps/':      'fps',
    '/football/': 'football',
    '/f1/':       'f1',
    '/tennis/':   'tennis',
    '/wwe/':      'wwe',
  };

  function detectGame() {
    const path = window.location.pathname;
    for (const [key, game] of Object.entries(GAME_DETECT)) {
      if (path.includes(key)) return game;
    }
    return 'cricket'; // fallback for root game
  }

  const CURRENT_GAME = detectGame();

  const GAME_LABELS = {
    cricket:  '🏏 Cricket',
    fps:      '🔫 Delhi Defiance',
    football: '⚽ Football',
    f1:       '🏎️ F1 Racing',
    tennis:   '🎾 Tennis',
    wwe:      '🥊 WWE',
  };

  // ── Socket resolution (game iframes share parent's socket via window.socket) ─
  function getSocket() {
    // Try parent window socket first (when running inside dashboard iframe)
    try {
      if (window.parent && window.parent.socket) return window.parent.socket;
    } catch(e) {}
    // Fall back to own window socket
    return window.socket || null;
  }

  function getUser() {
    try {
      if (window.parent && window.parent.currentUser) return window.parent.currentUser;
    } catch(e) {}
    return window.currentUser || null;
  }

  function getProfile() {
    try {
      if (window.parent && window.parent.profile) return window.parent.profile;
    } catch(e) {}
    return window.profile || null;
  }

  function getFriendsPresence() {
    try {
      if (window.parent && window.parent.friendsManager) {
        const fm = window.parent.friendsManager;
        if (!fm.activeFriendProfiles) {
          fm.activeFriendProfiles = [];
          fm.fetchFriendsPresence().then(() => {
            renderFriends();
          }).catch(err => console.warn('[PvP Panel] fetchFriendsPresence error:', err));
        }
        return fm.activeFriendProfiles || [];
      }
    } catch(e) {}
    return [];
  }

  // ── Styles ───────────────────────────────────────────────────────────────────
  const STYLES = `
    #ps-mp-fab {
      position: fixed;
      bottom: 22px;
      right: 22px;
      z-index: 99999;
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%);
      border: 2px solid rgba(56,189,248,0.55);
      box-shadow: 0 0 18px rgba(56,189,248,0.35), 0 4px 16px rgba(0,0,0,0.6);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      color: #fff;
      transition: transform 0.18s, box-shadow 0.18s;
      user-select: none;
    }
    #ps-mp-fab:hover {
      transform: scale(1.12);
      box-shadow: 0 0 28px rgba(56,189,248,0.6), 0 6px 20px rgba(0,0,0,0.7);
    }
    #ps-mp-fab .ps-mp-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #ef4444;
      border: 2px solid #0f172a;
      display: none;
    }

    #ps-mp-panel {
      position: fixed;
      bottom: 84px;
      right: 22px;
      z-index: 99998;
      width: 320px;
      background: rgba(10,15,30,0.97);
      border: 1px solid rgba(56,189,248,0.25);
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.8), 0 0 40px rgba(56,189,248,0.08);
      backdrop-filter: blur(20px);
      overflow: hidden;
      display: none;
      flex-direction: column;
      font-family: 'Inter', 'Segoe UI', sans-serif;
      animation: ps-mp-slide-in 0.22s cubic-bezier(0.34,1.56,0.64,1);
    }
    @keyframes ps-mp-slide-in {
      from { opacity:0; transform: translateY(16px) scale(0.96); }
      to   { opacity:1; transform: translateY(0) scale(1); }
    }
    #ps-mp-panel.open { display: flex; }

    .ps-mp-header {
      padding: 14px 16px 10px;
      background: linear-gradient(135deg, rgba(15,23,42,0.9) 0%, rgba(30,58,95,0.7) 100%);
      border-bottom: 1px solid rgba(56,189,248,0.15);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .ps-mp-header-title {
      font-size: 0.8rem;
      font-weight: 800;
      letter-spacing: 0.12em;
      color: #38bdf8;
      text-transform: uppercase;
    }
    .ps-mp-header-game {
      font-size: 0.7rem;
      color: rgba(255,255,255,0.45);
      font-weight: 600;
    }
    .ps-mp-close {
      background: none;
      border: none;
      color: rgba(255,255,255,0.4);
      font-size: 18px;
      cursor: pointer;
      padding: 0;
      line-height: 1;
      transition: color 0.15s;
    }
    .ps-mp-close:hover { color: #fff; }

    .ps-mp-tabs {
      display: flex;
      border-bottom: 1px solid rgba(255,255,255,0.07);
    }
    .ps-mp-tab {
      flex: 1;
      padding: 10px 0;
      text-align: center;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: rgba(255,255,255,0.4);
      cursor: pointer;
      border: none;
      background: none;
      border-bottom: 2px solid transparent;
      transition: all 0.18s;
      font-family: inherit;
    }
    .ps-mp-tab.active {
      color: #38bdf8;
      border-bottom-color: #38bdf8;
    }
    .ps-mp-tab:hover { color: rgba(255,255,255,0.75); }

    .ps-mp-body { padding: 14px 14px 16px; overflow-y: auto; max-height: 320px; }

    .ps-mp-section { display: none; }
    .ps-mp-section.active { display: block; }

    /* Friend rows */
    .ps-mp-friend-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 10px;
      border-radius: 8px;
      margin-bottom: 6px;
      background: rgba(255,255,255,0.025);
      border: 1px solid rgba(255,255,255,0.05);
    }
    .ps-mp-friend-info { display: flex; align-items: center; gap: 9px; }
    .ps-mp-avatar {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: linear-gradient(135deg,#2563eb,#7c3aed);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 0.8rem;
      color: #fff;
      position: relative;
      flex-shrink: 0;
    }
    .ps-mp-avatar .dot {
      position: absolute;
      bottom: -1px; right: -1px;
      width: 9px; height: 9px;
      border-radius: 50%;
      border: 2px solid #0a0f1e;
    }
    .ps-mp-friend-name {
      font-size: 0.8rem;
      font-weight: 700;
      color: #f1f5f9;
    }
    .ps-mp-friend-status {
      font-size: 0.65rem;
      color: rgba(255,255,255,0.4);
      font-weight: 600;
      margin-top: 1px;
    }
    .ps-mp-challenge-btn {
      background: linear-gradient(135deg,#0ea5e9,#2563eb);
      border: none;
      border-radius: 6px;
      color: #fff;
      font-size: 0.65rem;
      font-weight: 800;
      padding: 4px 10px;
      cursor: pointer;
      font-family: inherit;
      letter-spacing: 0.05em;
      transition: opacity 0.15s, transform 0.12s;
      white-space: nowrap;
    }
    .ps-mp-challenge-btn:hover { opacity: 0.85; transform: scale(1.05); }
    .ps-mp-challenge-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

    /* Matchmaking */
    .ps-mp-mm-status {
      text-align: center;
      padding: 24px 10px 14px;
    }
    .ps-mp-mm-icon {
      font-size: 2.5rem;
      margin-bottom: 8px;
    }
    .ps-mp-mm-label {
      font-size: 0.8rem;
      font-weight: 700;
      color: #f1f5f9;
      margin-bottom: 4px;
    }
    .ps-mp-mm-sub {
      font-size: 0.68rem;
      color: rgba(255,255,255,0.4);
      font-weight: 500;
    }
    .ps-mp-mm-btn {
      width: 100%;
      margin-top: 14px;
      padding: 11px;
      border: none;
      border-radius: 9px;
      font-size: 0.78rem;
      font-weight: 800;
      letter-spacing: 0.1em;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.18s;
    }
    .ps-mp-mm-btn.find {
      background: linear-gradient(135deg,#10b981,#059669);
      color: #fff;
      box-shadow: 0 4px 14px rgba(16,185,129,0.35);
    }
    .ps-mp-mm-btn.find:hover { opacity: 0.88; transform: translateY(-1px); }
    .ps-mp-mm-btn.cancel {
      background: rgba(239,68,68,0.15);
      color: #f87171;
      border: 1px solid rgba(239,68,68,0.3);
    }
    .ps-mp-mm-btn.cancel:hover { background: rgba(239,68,68,0.25); }

    .ps-mp-spinner {
      display: inline-block;
      width: 22px; height: 22px;
      border: 3px solid rgba(255,255,255,0.1);
      border-top-color: #38bdf8;
      border-radius: 50%;
      animation: ps-spin 0.7s linear infinite;
      margin-bottom: 10px;
    }
    @keyframes ps-spin { to { transform: rotate(360deg); } }

    .ps-mp-empty {
      text-align: center;
      color: rgba(255,255,255,0.3);
      font-size: 0.73rem;
      padding: 30px 10px;
      font-weight: 500;
    }

    /* Match Found overlay */
    #ps-mp-match-found {
      position: fixed;
      inset: 0;
      z-index: 999999;
      background: rgba(0,0,0,0.87);
      display: none;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(8px);
    }
    #ps-mp-match-found.show { display: flex; }
    .ps-mp-mf-box {
      background: linear-gradient(135deg,#0f172a,#1e3a5f);
      border: 2px solid #38bdf8;
      border-radius: 20px;
      padding: 36px 40px;
      text-align: center;
      box-shadow: 0 0 60px rgba(56,189,248,0.4);
      animation: ps-mp-pop 0.35s cubic-bezier(0.34,1.56,0.64,1);
    }
    @keyframes ps-mp-pop {
      from { transform: scale(0.7); opacity: 0; }
      to   { transform: scale(1); opacity: 1; }
    }
    .ps-mp-mf-icon { font-size: 3rem; margin-bottom: 12px; }
    .ps-mp-mf-title {
      font-size: 1.4rem;
      font-weight: 900;
      color: #38bdf8;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    .ps-mp-mf-sub {
      font-size: 0.8rem;
      color: rgba(255,255,255,0.6);
      font-weight: 500;
      margin-bottom: 24px;
    }
    .ps-mp-mf-connecting {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      font-size: 0.8rem;
      color: #10b981;
      font-weight: 700;
    }
  `;

  // ── DOM ──────────────────────────────────────────────────────────────────────
  function buildUI() {
    const style = document.createElement('style');
    style.textContent = STYLES;
    document.head.appendChild(style);

    // FAB button
    const fab = document.createElement('div');
    fab.id = 'ps-mp-fab';
    fab.innerHTML = `🎮<span class="ps-mp-badge" id="ps-mp-badge"></span>`;
    fab.title = 'Online Multiplayer';
    document.body.appendChild(fab);

    // Panel
    const panel = document.createElement('div');
    panel.id = 'ps-mp-panel';
    panel.innerHTML = `
      <div class="ps-mp-header">
        <div>
          <div class="ps-mp-header-title">Online Play</div>
          <div class="ps-mp-header-game">${GAME_LABELS[CURRENT_GAME] || CURRENT_GAME}</div>
        </div>
        <button class="ps-mp-close" id="ps-mp-close">&#x2715;</button>
      </div>
      <div class="ps-mp-tabs">
        <button class="ps-mp-tab active" data-tab="pvp">⚔️ PVP (Friends)</button>
        <button class="ps-mp-tab" data-tab="mm">🌐 Matchmaking</button>
      </div>
      <div class="ps-mp-body">
        <div class="ps-mp-section active" id="ps-mp-pvp">
          <div id="ps-mp-pvp-list"><div class="ps-mp-empty">Loading friends...</div></div>
          <div id="ps-mp-pvp-msg" style="font-size:0.68rem;color:rgba(255,255,255,0.35);text-align:center;margin-top:8px;"></div>
        </div>
        <div class="ps-mp-section" id="ps-mp-mm">
          <div class="ps-mp-mm-status" id="ps-mp-mm-status">
            <div class="ps-mp-mm-icon">🌐</div>
            <div class="ps-mp-mm-label">Random Matchmaking</div>
            <div class="ps-mp-mm-sub">Get paired with any online player in ${GAME_LABELS[CURRENT_GAME] || 'this game'}</div>
          </div>
          <button class="ps-mp-mm-btn find" id="ps-mp-mm-btn">FIND MATCH</button>
        </div>
      </div>
    `;
    document.body.appendChild(panel);

    // Match Found overlay
    const mf = document.createElement('div');
    mf.id = 'ps-mp-match-found';
    mf.innerHTML = `
      <div class="ps-mp-mf-box">
        <div class="ps-mp-mf-icon">🎯</div>
        <div class="ps-mp-mf-title">Match Found!</div>
        <div class="ps-mp-mf-sub" id="ps-mp-mf-sub">Connecting you to the match...</div>
        <div class="ps-mp-mf-connecting">
          <div class="ps-mp-spinner"></div>
          <span>Launching game...</span>
        </div>
      </div>
    `;
    document.body.appendChild(mf);

    return { fab, panel, mf };
  }

  // ── State ────────────────────────────────────────────────────────────────────
  let isSearching = false;
  let pendingChallengeId = null;

  // ── Game join logic (game-specific join actions) ──────────────────────────────
  function launchMatch(matchData) {
    const { roomCode, game, host } = matchData;
    const socket = getSocket();
    const isHost = socket && (host.socketId === socket.id);

    // Show match found overlay
    const mfEl = document.getElementById('ps-mp-match-found');
    const mfSub = document.getElementById('ps-mp-mf-sub');
    if (mfEl) {
      if (mfSub) mfSub.textContent = `${matchData.host.username} vs ${matchData.guest ? matchData.guest.username : 'Opponent'} · ${GAME_LABELS[game]}`;
      mfEl.classList.add('show');
    }

    // Game-specific join
    setTimeout(() => {
      if (game === 'fps') {
        const mp = window.FPSGameLoop && window.FPSGameLoop.multiplayer;
        if (mp) {
          if (isHost) {
            // Host already created, server sends room code — just open lobby
            mp.roomCode = roomCode;
            mp.isMultiplayer = true;
            mp.updateLobbyUI && mp.updateLobbyUI();
          } else {
            mp.joinRoom(roomCode, window.FPSState && window.FPSState.selectedAgentId || 'agni',
              getProfile() && getProfile().username || 'Player');
          }
        }
      } else {
        // For other games: emit a game-specific join event
        // The game's own multiplayer layer (or future sync layer) handles this
        if (socket) {
          socket.emit('ps-game-join', { roomCode, game, isHost });
        }
      }

      // Auto close match found after 4s
      setTimeout(() => {
        if (mfEl) mfEl.classList.remove('show');
      }, 4000);
    }, 1200);
  }

  // ── Render friend list ───────────────────────────────────────────────────────
  function renderFriends() {
    const list = document.getElementById('ps-mp-pvp-list');
    if (!list) return;

    const profiles = getFriendsPresence();
    const msg = document.getElementById('ps-mp-pvp-msg');

    if (!getUser()) {
      list.innerHTML = `<div class="ps-mp-empty">Sign in to challenge friends.</div>`;
      return;
    }

    if (!profiles || profiles.length === 0) {
      list.innerHTML = `<div class="ps-mp-empty">No friends found.<br>Add friends from the PlayStation menu.</div>`;
      return;
    }

    // Get presence from parent friendsManager
    let presenceMap = {};
    try {
      if (window.parent && window.parent.friendsManager) {
        presenceMap = window.parent.friendsManager._lastPresenceMap || {};
      }
    } catch(e) {}

    list.innerHTML = profiles.map(p => {
      const presence = presenceMap[p.uid] || { online: false };
      const online = !!presence.online;
      const initial = (p.username || 'G')[0].toUpperCase();
      return `
        <div class="ps-mp-friend-row">
          <div class="ps-mp-friend-info">
            <div class="ps-mp-avatar">
              ${initial}
              <span class="dot" style="background:${online ? '#10b981' : '#6b7280'};"></span>
            </div>
            <div>
              <div class="ps-mp-friend-name">${p.username || 'Player'}</div>
              <div class="ps-mp-friend-status">${online ? (presence.activity || 'Online') : 'Offline'}</div>
            </div>
          </div>
          <button class="ps-mp-challenge-btn" 
            onclick="window.PSMultiplayer.challenge('${p.uid}','${(p.username || 'Player').replace(/'/g, '')}')"
            ${!online ? 'disabled' : ''}>
            CHALLENGE
          </button>
        </div>
      `;
    }).join('');

    if (msg) msg.textContent = 'Friends online — click CHALLENGE to start a match!';
  }

  // ── Matchmaking UI ───────────────────────────────────────────────────────────
  function setSearching(on) {
    isSearching = on;
    const btn = document.getElementById('ps-mp-mm-btn');
    const statusEl = document.getElementById('ps-mp-mm-status');
    if (!btn || !statusEl) return;

    if (on) {
      btn.className = 'ps-mp-mm-btn cancel';
      btn.textContent = 'CANCEL SEARCH';
      statusEl.innerHTML = `
        <div class="ps-mp-spinner"></div>
        <div class="ps-mp-mm-label">Searching for opponent...</div>
        <div class="ps-mp-mm-sub">Looking for a ${GAME_LABELS[CURRENT_GAME]} player</div>
      `;
    } else {
      btn.className = 'ps-mp-mm-btn find';
      btn.textContent = 'FIND MATCH';
      statusEl.innerHTML = `
        <div class="ps-mp-mm-icon">🌐</div>
        <div class="ps-mp-mm-label">Random Matchmaking</div>
        <div class="ps-mp-mm-sub">Get paired with any online player in ${GAME_LABELS[CURRENT_GAME] || 'this game'}</div>
      `;
    }
  }

  // ── Socket events ────────────────────────────────────────────────────────────
  function bindSocketEvents() {
    const socket = getSocket();
    if (!socket) {
      setTimeout(bindSocketEvents, 800);
      return;
    }

    socket.on('ps-matchmaking-queued', () => setSearching(true));
    socket.on('ps-matchmaking-cancelled', () => setSearching(false));
    socket.on('ps-matchmaking-error', msg => { setSearching(false); alert('Matchmaking: ' + msg); });

    socket.on('ps-matchmaking-found', matchData => {
      setSearching(false);
      launchMatch(matchData);
    });

    socket.on('ps-challenge-sent', ({ toUsername }) => {
      const msg = document.getElementById('ps-mp-pvp-msg');
      if (msg) msg.textContent = `Challenge sent to ${toUsername}! Waiting for response...`;
    });

    socket.on('ps-challenge-declined', () => {
      const msg = document.getElementById('ps-mp-pvp-msg');
      if (msg) msg.textContent = 'Challenge was declined.';
    });

    socket.on('ps-challenge-expired', () => {
      const msg = document.getElementById('ps-mp-pvp-msg');
      if (msg) msg.textContent = 'Challenge expired (no response).';
    });

    socket.on('ps-challenge-error', errMsg => {
      const msg = document.getElementById('ps-mp-pvp-msg');
      if (msg) msg.textContent = 'Error: ' + errMsg;
    });

    socket.on('ps-match-start', matchData => {
      launchMatch(matchData);
    });
  }

  // ── Public API ───────────────────────────────────────────────────────────────
  window.PSMultiplayer = {
    challenge(toUid, toUsername) {
      const socket = getSocket();
      if (!socket) { alert('Not connected. Please reload.'); return; }
      const user = getUser();
      const profile = getProfile();
      if (!user) { alert('Please sign in first.'); return; }
      const fromUsername = (profile && profile.username) || 'Player';
      const msg = document.getElementById('ps-mp-pvp-msg');
      if (msg) msg.textContent = `Sending challenge to ${toUsername}...`;
      socket.emit('ps-challenge-send', {
        toUid,
        game: CURRENT_GAME,
        fromUsername
      });
    },

    findMatch() {
      if (isSearching) {
        const socket = getSocket();
        if (socket) socket.emit('ps-matchmaking-cancel');
        return;
      }
      const socket = getSocket();
      if (!socket) { alert('Not connected.'); return; }
      const user = getUser();
      const profile = getProfile();
      if (!user) { alert('Please sign in first.'); return; }
      socket.emit('ps-matchmaking-join', {
        game: CURRENT_GAME,
        uid: user.uid,
        username: (profile && profile.username) || 'Player'
      });
    }
  };

  // ── Init ─────────────────────────────────────────────────────────────────────
  function init() {
    const { fab, panel } = buildUI();

    // FAB toggle
    fab.addEventListener('click', () => {
      panel.classList.toggle('open');
      if (panel.classList.contains('open')) {
        // Trigger a background presence refresh when opening the panel
        try {
          if (window.parent && window.parent.friendsManager) {
            window.parent.friendsManager.fetchFriendsPresence().then(() => {
              renderFriends();
            }).catch(e => {});
          }
        } catch(e) {}
        renderFriends();
      }
    });

    document.getElementById('ps-mp-close').addEventListener('click', () => {
      panel.classList.remove('open');
    });

    // Tabs
    panel.querySelectorAll('.ps-mp-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        panel.querySelectorAll('.ps-mp-tab').forEach(t => t.classList.remove('active'));
        panel.querySelectorAll('.ps-mp-section').forEach(s => s.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('ps-mp-' + tab.dataset.tab).classList.add('active');
        if (tab.dataset.tab === 'pvp') renderFriends();
      });
    });

    // Matchmaking button
    document.getElementById('ps-mp-mm-btn').addEventListener('click', () => {
      window.PSMultiplayer.findMatch();
    });

    // Bind socket (may retry if socket not ready yet)
    bindSocketEvents();

    // Check if there is an active match pending for this game session
    try {
      const activeMatchStr = sessionStorage.getItem('ps_active_match');
      if (activeMatchStr) {
        const matchData = JSON.parse(activeMatchStr);
        if (matchData.game === CURRENT_GAME) {
          sessionStorage.removeItem('ps_active_match');
          // Delay briefly to allow the game logic scripts to fully load/register first
          setTimeout(() => {
            launchMatch(matchData);
          }, 1000);
        }
      }
    } catch(e) {
      console.warn('[PvP] Error reading active match from storage:', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
