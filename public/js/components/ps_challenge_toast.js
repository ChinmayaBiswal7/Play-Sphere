/**
 * ps_challenge_toast.js
 * PlaySphere — Incoming Game Challenge Toast
 * Loaded in the MAIN DASHBOARD (index.html).
 * Shows a premium toast notification when a friend sends a game challenge.
 * Player can Accept or Decline without leaving what they are doing.
 */

(function () {
  'use strict';

  const GAME_LABELS = {
    cricket:  '🏏 Cricket',
    fps:      '🔫 Delhi Defiance',
    football: '⚽ Football',
    f1:       '🏎️ F1 Racing',
    tennis:   '🎾 Tennis',
    wwe:      '🥊 WWE',
  };

  const GAME_ROUTES = {
    cricket:  null,          // cricket runs on main page, no iframe redirect needed
    fps:      '/fps/',
    football: '/football/',
    f1:       '/f1/',
    tennis:   '/tennis/',
    wwe:      '/wwe/',
  };

  // ── Styles ───────────────────────────────────────────────────────────────────
  const STYLES = `
    #ps-challenge-toast-container {
      position: fixed;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 999999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
      align-items: center;
    }
    .ps-challenge-toast {
      pointer-events: all;
      background: rgba(10,15,30,0.97);
      border: 1px solid rgba(56,189,248,0.4);
      border-radius: 16px;
      box-shadow: 0 0 50px rgba(56,189,248,0.25), 0 20px 50px rgba(0,0,0,0.75);
      backdrop-filter: blur(20px);
      padding: 18px 22px;
      display: flex;
      align-items: center;
      gap: 16px;
      min-width: 340px;
      max-width: 420px;
      font-family: 'Inter', 'Segoe UI', sans-serif;
      animation: ps-toast-in 0.38s cubic-bezier(0.34,1.56,0.64,1);
      position: relative;
    }
    .ps-challenge-toast.fade-out {
      animation: ps-toast-out 0.3s ease forwards;
    }
    @keyframes ps-toast-in {
      from { opacity:0; transform: translateY(30px) scale(0.92); }
      to   { opacity:1; transform: translateY(0) scale(1); }
    }
    @keyframes ps-toast-out {
      to { opacity:0; transform: translateY(20px) scale(0.92); }
    }
    .ps-challenge-toast-icon {
      font-size: 2.2rem;
      flex-shrink: 0;
    }
    .ps-challenge-toast-body { flex: 1; }
    .ps-challenge-toast-from {
      font-size: 0.65rem;
      color: #38bdf8;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      margin-bottom: 3px;
    }
    .ps-challenge-toast-msg {
      font-size: 0.88rem;
      font-weight: 700;
      color: #f1f5f9;
      margin-bottom: 2px;
    }
    .ps-challenge-toast-game {
      font-size: 0.7rem;
      color: rgba(255,255,255,0.45);
      font-weight: 600;
    }
    .ps-challenge-toast-actions {
      display: flex;
      flex-direction: column;
      gap: 6px;
      flex-shrink: 0;
    }
    .ps-toast-accept {
      background: linear-gradient(135deg,#10b981,#059669);
      border: none;
      border-radius: 7px;
      color: #fff;
      font-size: 0.68rem;
      font-weight: 800;
      padding: 6px 14px;
      cursor: pointer;
      font-family: inherit;
      letter-spacing: 0.06em;
      box-shadow: 0 3px 10px rgba(16,185,129,0.35);
      transition: opacity 0.15s, transform 0.12s;
    }
    .ps-toast-accept:hover { opacity: 0.88; transform: scale(1.04); }
    .ps-toast-decline {
      background: rgba(239,68,68,0.12);
      border: 1px solid rgba(239,68,68,0.3);
      border-radius: 7px;
      color: #f87171;
      font-size: 0.68rem;
      font-weight: 700;
      padding: 5px 14px;
      cursor: pointer;
      font-family: inherit;
      transition: background 0.15s;
    }
    .ps-toast-decline:hover { background: rgba(239,68,68,0.22); }
    .ps-challenge-toast-timer {
      position: absolute;
      bottom: 0;
      left: 0;
      height: 3px;
      background: linear-gradient(90deg, #38bdf8, #6366f1);
      border-radius: 0 0 16px 16px;
      animation: ps-timer-drain 28s linear forwards;
    }
    @keyframes ps-timer-drain {
      from { width: 100%; }
      to   { width: 0%; }
    }
  `;

  // ── Inject styles ────────────────────────────────────────────────────────────
  function injectStyles() {
    const s = document.createElement('style');
    s.textContent = STYLES;
    document.head.appendChild(s);
  }

  function getContainer() {
    let c = document.getElementById('ps-challenge-toast-container');
    if (!c) {
      c = document.createElement('div');
      c.id = 'ps-challenge-toast-container';
      document.body.appendChild(c);
    }
    return c;
  }

  // ── Show a toast ─────────────────────────────────────────────────────────────
  function showChallengeToast({ challengeId, fromUsername, game }) {
    const container = getContainer();
    const gameLabel = GAME_LABELS[game] || game;

    const toast = document.createElement('div');
    toast.className = 'ps-challenge-toast';
    toast.innerHTML = `
      <div class="ps-challenge-toast-icon">${gameLabel.split(' ')[0]}</div>
      <div class="ps-challenge-toast-body">
        <div class="ps-challenge-toast-from">⚔️ Game Challenge</div>
        <div class="ps-challenge-toast-msg">${fromUsername} challenged you!</div>
        <div class="ps-challenge-toast-game">${gameLabel}</div>
      </div>
      <div class="ps-challenge-toast-actions">
        <button class="ps-toast-accept" id="toast-accept-${challengeId}">ACCEPT</button>
        <button class="ps-toast-decline" id="toast-decline-${challengeId}">Decline</button>
      </div>
      <div class="ps-challenge-toast-timer"></div>
    `;

    container.appendChild(toast);

    const remove = () => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 320);
    };

    document.getElementById(`toast-accept-${challengeId}`).addEventListener('click', () => {
      respondToChallenge(challengeId, true, game);
      remove();
    });
    document.getElementById(`toast-decline-${challengeId}`).addEventListener('click', () => {
      respondToChallenge(challengeId, false, game);
      remove();
    });

    // Auto-expire after 28 seconds
    setTimeout(remove, 28000);
  }

  function respondToChallenge(challengeId, accepted, game) {
    if (window.socket) {
      window.socket.emit('ps-challenge-respond', { challengeId, accepted });
    }

    if (accepted) {
      // Navigate to game if not already there
      const route = GAME_ROUTES[game];
      if (route) {
        // If there's an iframe for the game in the dashboard, load it
        const iframe = document.getElementById('game-session-iframe');
        if (iframe) {
          iframe.src = route;
        } else {
          window.open(route, '_blank');
        }
      }
    }
  }

  // ── Socket binding ───────────────────────────────────────────────────────────
  function bindSocket() {
    const socket = window.socket;
    if (!socket) {
      setTimeout(bindSocket, 600);
      return;
    }

    socket.on('ps-challenge-incoming', (data) => {
      showChallengeToast(data);
      // Optional: play a notification sound
      if (window.ps5Sound && typeof window.ps5Sound.playNotification === 'function') {
        window.ps5Sound.playNotification();
      }
    });

    // Handle universal matchmaking and friend challenges start
    const startMatchHandler = (matchData) => {
      console.log('[PvP] Match start triggered:', matchData);
      
      // Save match details to sessionStorage so iframe multi-player script knows it's an active PvP match immediately on load
      sessionStorage.setItem('ps_active_match', JSON.stringify(matchData));

      // Trigger the premium transition overlay and load game iframe
      if (typeof window.ps5LaunchGame === 'function') {
        window.ps5LaunchGame(matchData.game, matchData.roomCode);
      } else {
        // Fallback if home script is not fully loaded
        const route = GAME_ROUTES[matchData.game];
        if (route) {
          let iframe = document.getElementById('game-session-iframe');
          if (!iframe) {
            iframe = document.createElement('iframe');
            iframe.id = 'game-session-iframe';
            iframe.style.cssText = "position: fixed; inset: 0; width: 100vw; height: 100vh; border: none; z-index: 999999; background: #000;";
            document.body.appendChild(iframe);
          }
          iframe.src = `${route}?room=${matchData.roomCode}`;
          iframe.style.display = 'block';
        }
      }
    };

    socket.on('ps-match-start', startMatchHandler);
    socket.on('ps-matchmaking-found', startMatchHandler);
  }

  // ── Init ─────────────────────────────────────────────────────────────────────
  function init() {
    injectStyles();
    bindSocket();
    console.log('[PlaySphere] Challenge Toast system initialized.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
