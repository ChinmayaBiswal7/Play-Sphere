/**
 * Football Legends 2026 - Multiplayer PVP / Friend Mode Screen Component
 */

import { gameState, CLUBS_DATABASE } from '../state.js';
import { AudioSynth } from '../audio.js';
import { SocketController } from '../network.js';

export function renderMultiplayer(container, onPlayMatch) {
  // Get all clubs flat list for selection dropdowns
  const ALL_CLUBS = [];
  Object.keys(CLUBS_DATABASE).forEach(country => {
    CLUBS_DATABASE[country].forEach((club, idx) => {
      ALL_CLUBS.push({ name: club.name, crest: club.crest, country, index: idx });
    });
  });

  let currentSubTab = 'RANKED'; // 'RANKED' or 'FRIENDLY'
  let pvpRoomCode = null;
  let pvpPlayers = [];
  let pvpState = 'WAITING';
  let mySlot = null; // 1 (Host) or 2 (Guest)

  const drawScreen = () => {
    if (pvpRoomCode) {
      drawLobby();
      return;
    }

    container.innerHTML = `
      <div class="subscreen-layout">
        <!-- Left Tabs -->
        <aside class="subscreen-sidebar">
          <button class="sub-tab-btn ${currentSubTab === 'RANKED' ? 'active' : ''}" id="tab-ranked">RANKED MATCH</button>
          <button class="sub-tab-btn ${currentSubTab === 'FRIENDLY' ? 'active' : ''}" id="tab-friendly">FRIENDLY MATCH</button>
        </aside>

        <!-- Main Body -->
        <main class="subscreen-main-content">
          ${currentSubTab === 'RANKED' ? renderRankedView() : renderFriendlyView()}
        </main>
      </div>
    `;

    // Bind tab clicks
    document.getElementById('tab-ranked').onclick = () => {
      currentSubTab = 'RANKED';
      AudioSynth.playClick();
      drawScreen();
    };

    document.getElementById('tab-friendly').onclick = () => {
      currentSubTab = 'FRIENDLY';
      AudioSynth.playClick();
      drawScreen();
    };

    // Bind action clicks
    if (currentSubTab === 'RANKED') {
      document.getElementById('btn-multi-quickplay').onclick = () => {
        AudioSynth.playWhistle();
        onPlayMatch("RED DEVILS", "PARIS STARS"); 
      };
    } else {
      document.getElementById('btn-create-pvp').onclick = () => {
        AudioSynth.playClick();
        createPvPRoom();
      };

      document.getElementById('btn-challenge-friend').onclick = () => {
        AudioSynth.playClick();
        const fab = document.getElementById('ps-mp-fab');
        if (fab) fab.click();
      };

      document.getElementById('btn-join-pvp').onclick = () => {
        AudioSynth.playClick();
        const codeInput = document.getElementById('pvp-code-input').value.toUpperCase().trim();
        if (codeInput.length === 8) { // PVP-XXXX
          joinPvPRoom(codeInput);
        } else {
          alert("Please enter a valid 8-character PvP Room Code (e.g. PVP-ABCD)");
        }
      };
    }
  };

  const renderRankedView = () => `
    <div class="multiplayer-hero-layout">
      <!-- Rank Shield Card -->
      <div class="multi-rank-card">
        <div class="rank-crest purple-glow">🛡️</div>
        <h2 class="font-display font-black">LEGEND III</h2>
        <div class="rank-rating-row">
          <span>RATING: <b>2450</b></span>
          <span>RANK: <b class="purple-text">TOP 3%</b></span>
        </div>
        
        <div class="multi-season-bonus">
          <span class="lime-text">SEASON REWARD</span>
          <div class="reward-package">
            <span>🎁 CHAMPIONS PACK</span>
            <small>UNLOCKED AT SEASON END</small>
          </div>
        </div>
      </div>

      <!-- Quick Play Card -->
      <div class="multi-quickplay-card" id="btn-multi-quickplay">
        <div class="quickplay-details">
          <strong>QUICK PLAY</strong>
          <p>Play a random online matchmaker now.</p>
        </div>
        <div class="quickplay-arrow">➔</div>
      </div>
    </div>
  `;

  const renderFriendlyView = () => `
    <div class="multiplayer-hero-layout" style="gap: 24px; flex-wrap: wrap;">
      <!-- Challenge Friend Card -->
      <div class="multi-quickplay-card" id="btn-challenge-friend" style="background: linear-gradient(135deg, rgba(168,85,247,0.15) 0%, rgba(88,28,135,0.4) 100%); border: 1.5px solid #a855f7;">
        <div class="quickplay-details">
          <strong class="purple-text" style="color: #c084fc;">CHALLENGE FRIEND</strong>
          <p>Open friends list to invite online friends directly.</p>
        </div>
        <div class="quickplay-arrow">👥</div>
      </div>

      <!-- Create PVP Room Card -->
      <div class="multi-quickplay-card" id="btn-create-pvp" style="background: linear-gradient(135deg, rgba(163,230,53,0.15) 0%, rgba(20,83,45,0.4) 100%); border: 1.5px solid var(--accent-lime);">
        <div class="quickplay-details">
          <strong class="lime-text">CREATE PVP LOBBY</strong>
          <p>Get a lobby code to invite and play with your friend.</p>
        </div>
        <div class="quickplay-arrow">➕</div>
      </div>

      <!-- Join PVP Room Card -->
      <div class="multi-invite-card" style="flex-direction: column; align-items: stretch; gap: 16px; padding: 24px; flex: 1; min-width: 285px;">
        <div>
          <strong>JOIN PVP LOBBY</strong>
          <p style="font-size: 0.8rem; color: rgba(255,255,255,0.6);">Enter the 8-character lobby code below:</p>
        </div>
        
        <div style="display: flex; gap: 12px;">
          <input type="text" id="pvp-code-input" placeholder="PVP-ABCD" style="flex: 1; padding: 12px; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #fff; font-family: 'Orbitron', sans-serif; font-size: 1rem; text-align: center; letter-spacing: 2px;">
          <button class="menu-btn primary-btn" id="btn-join-pvp" style="padding: 12px 24px; margin: 0; font-size: 0.9rem;">JOIN LOBBY</button>
        </div>
      </div>
    </div>
  `;

  const drawLobby = () => {
    const p1 = pvpPlayers.find(p => p.slot === 1) || { username: 'Waiting...', team: null, ready: false };
    const p2 = pvpPlayers.find(p => p.slot === 2) || { username: 'Waiting for friend...', team: null, ready: false };

    // Find active selection options
    const p1Options = ALL_CLUBS.map(c => `<option value="${c.name}" ${p1.team === c.name ? 'selected' : ''}>${c.crest} ${c.name}</option>`).join('');
    const p2Options = ALL_CLUBS.map(c => `<option value="${c.name}" ${p2.team === c.name ? 'selected' : ''}>${c.crest} ${c.name}</option>`).join('');

    container.innerHTML = `
      <div class="pvp-lobby-layout" style="display: flex; flex-direction: column; width: 100%; height: 100%; padding: 20px; justify-content: space-between; font-family: 'Orbitron', sans-serif; color: #fff;">
        
        <!-- Header -->
        <div class="lobby-header" style="text-align: center; position: relative;">
          <h2 style="font-size: 1.6rem; font-weight: 800; color: var(--accent-lime); margin-bottom: 6px;">ONLINE FRIENDLY LOBBY</h2>
          <div style="font-size: 0.9rem; color: rgba(255,255,255,0.6);">ROOM STATE: <span style="color: #60a5fa; font-weight: bold;">${pvpState}</span></div>
          
          <!-- Code display -->
          <div style="margin-top: 14px; background: rgba(0,0,0,0.5); padding: 8px 20px; border-radius: 20px; display: inline-flex; align-items: center; gap: 12px; border: 1px solid rgba(255,255,255,0.15);">
            <span>LOBBY CODE: <b style="color: var(--accent-lime); font-size: 1.1rem; letter-spacing: 1.5px;">${pvpRoomCode}</b></span>
            <button id="btn-copy-code" style="background: none; border: none; cursor: pointer; color: #60a5fa; font-size: 0.85rem; font-weight: bold; text-decoration: underline;">COPY</button>
          </div>
        </div>

        <!-- Players Cards Grid -->
        <div style="display: flex; gap: 32px; justify-content: center; align-items: center; margin: 30px 0;">
          
          <!-- Player 1 Card (Home) -->
          <div style="flex: 1; max-width: 320px; background: rgba(15,23,42,0.65); border: 2px solid ${mySlot === 1 ? 'var(--accent-lime)' : 'rgba(255,255,255,0.1)'}; border-radius: 16px; padding: 24px; text-align: center; position: relative; box-shadow: 0 10px 25px rgba(0,0,0,0.4);">
            <div style="position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: #ef4444; color: #fff; padding: 2px 12px; border-radius: 10px; font-size: 0.65rem; font-weight: bold; text-transform: uppercase;">HOME TEAM</div>
            <h3 style="font-size: 1.1rem; font-weight: bold; margin-bottom: 16px; color: ${p1.ready ? '#22c55e' : '#f59e0b'}">${p1.username} ${p1.ready ? '✓' : ''}</h3>
            
            <div style="margin-bottom: 20px;">
              <label style="font-size: 0.75rem; color: rgba(255,255,255,0.5); display: block; margin-bottom: 8px;">CHOOSE CLUB</label>
              <select id="p1-club-select" ${mySlot === 1 ? '' : 'disabled'} style="width: 100%; padding: 10px; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #fff; font-family: 'Orbitron', sans-serif;">
                ${p1Options}
              </select>
            </div>
            
            <div style="font-weight: bold; font-size: 0.85rem; color: ${p1.ready ? '#22c55e' : '#f59e0b'}">
              STATUS: ${p1.ready ? 'READY' : 'SELECTING TEAM'}
            </div>
          </div>

          <div style="font-size: 2rem; font-weight: bold; color: rgba(255,255,255,0.3);">VS</div>

          <!-- Player 2 Card (Away) -->
          <div style="flex: 1; max-width: 320px; background: rgba(15,23,42,0.65); border: 2px solid ${mySlot === 2 ? 'var(--accent-lime)' : 'rgba(255,255,255,0.1)'}; border-radius: 16px; padding: 24px; text-align: center; position: relative; box-shadow: 0 10px 25px rgba(0,0,0,0.4);">
            <div style="position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: #3b82f6; color: #fff; padding: 2px 12px; border-radius: 10px; font-size: 0.65rem; font-weight: bold; text-transform: uppercase;">AWAY TEAM</div>
            <h3 style="font-size: 1.1rem; font-weight: bold; margin-bottom: 16px; color: ${p2.ready ? '#22c55e' : '#f59e0b'}">${p2.username} ${p2.ready ? '✓' : ''}</h3>
            
            <div style="margin-bottom: 20px;">
              <label style="font-size: 0.75rem; color: rgba(255,255,255,0.5); display: block; margin-bottom: 8px;">CHOOSE CLUB</label>
              <select id="p2-club-select" ${mySlot === 2 ? '' : 'disabled'} style="width: 100%; padding: 10px; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: #fff; font-family: 'Orbitron', sans-serif;">
                ${p2Options}
              </select>
            </div>

            <div style="font-weight: bold; font-size: 0.85rem; color: ${p2.ready ? '#22c55e' : '#f59e0b'}">
              STATUS: ${p2.ready ? 'READY' : 'SELECTING TEAM'}
            </div>
          </div>

        </div>

        <!-- Controls Footer -->
        <div style="text-align: center; display: flex; gap: 16px; justify-content: center;">
          <button class="menu-btn danger-btn" id="btn-leave-lobby" style="padding: 12px 30px; margin: 0;">LEAVE LOBBY</button>
          
          ${mySlot ? `
            <button class="menu-btn ${pvpPlayers.find(p => p.slot === mySlot)?.ready ? 'secondary-btn' : 'primary-btn'}" id="btn-ready-toggle" style="padding: 12px 40px; margin: 0; min-width: 160px;">
              ${pvpPlayers.find(p => p.slot === mySlot)?.ready ? 'CANCEL READY' : 'SET READY'}
            </button>
          ` : ''}
        </div>

      </div>
    `;

    // Bind Lobby Actions
    document.getElementById('btn-copy-code').onclick = () => {
      navigator.clipboard.writeText(pvpRoomCode);
      AudioSynth.playClick();
      alert("Lobby Code copied to clipboard!");
    };

    document.getElementById('btn-leave-lobby').onclick = () => {
      AudioSynth.playClick();
      leavePvPRoom();
    };

    const readyBtn = document.getElementById('btn-ready-toggle');
    if (readyBtn) {
      readyBtn.onclick = () => {
        AudioSynth.playClick();
        const pObj = pvpPlayers.find(p => p.slot === mySlot);
        const newReady = !pObj?.ready;
        SocketController.socket.emit('pvp-ready', { ready: newReady });
      };
    }

    // Bind dropdown selectors
    const p1Select = document.getElementById('p1-club-select');
    if (p1Select) {
      p1Select.onchange = () => {
        AudioSynth.playClick();
        SocketController.socket.emit('pvp-select-team', { teamName: p1Select.value });
      };
    }

    const p2Select = document.getElementById('p2-club-select');
    if (p2Select) {
      p2Select.onchange = () => {
        AudioSynth.playClick();
        SocketController.socket.emit('pvp-select-team', { teamName: p2Select.value });
      };
    }
  };

  // ── SOCKET.IO ROOM FLOW ACTIONS ──
  const createPvPRoom = () => {
    if (!SocketController.socket) {
      alert("Network controller not initialized. Cannot create PvP lobby.");
      return;
    }
    setupSocketListeners();
    SocketController.socket.emit('pvp-create-room');
  };

  const joinPvPRoom = (roomCode) => {
    if (!SocketController.socket) {
      alert("Network controller not initialized. Cannot join PvP lobby.");
      return;
    }
    setupSocketListeners();
    SocketController.socket.emit('pvp-join-room', { roomCode });
  };

  const leavePvPRoom = () => {
    if (SocketController.socket) {
      SocketController.socket.emit('pvp-ready', { ready: false });
      // Reconnect/reload or simply clear the local room code
      location.reload(); // Quick reset
    }
  };

  const setupSocketListeners = () => {
    const socket = SocketController.socket;
    if (!socket) return;

    // Remove duplicates
    socket.off('pvp-room-created');
    socket.off('pvp-room-joined');
    socket.off('pvp-room-updated');
    socket.off('pvp-player-left');
    socket.off('pvp-match-started');
    socket.off('pvp-error');

    socket.on('pvp-room-created', (data) => {
      pvpRoomCode = data.roomCode;
      pvpPlayers = data.players;
      pvpState = data.state;
      mySlot = 1; // I am player 1
      drawScreen();
    });

    socket.on('pvp-room-joined', (data) => {
      pvpRoomCode = data.roomCode;
      pvpPlayers = data.players;
      pvpState = data.state;
      if (mySlot === null) mySlot = 2; // I am player 2
      drawScreen();
    });

    socket.on('pvp-room-updated', (data) => {
      pvpPlayers = data.players;
      pvpState = data.state;
      drawScreen();
    });

    socket.on('pvp-player-left', (data) => {
      pvpPlayers = data.players;
      pvpState = data.state;
      alert("Opponent player left the lobby.");
      drawScreen();
    });

    socket.on('pvp-error', (msg) => {
      alert(msg);
    });

    socket.on('pvp-match-started', (data) => {
      // Hide the menu and enter PVP Mode!
      document.getElementById('subscreen-view').style.display = 'none';
      document.getElementById('main-menu-screen').style.display = 'none';
      
      // Import the pvp controller dynamically and launch it!
      import('../pvp.js').then(module => {
        module.launchMatchInPvPMode(pvpRoomCode, mySlot, data.homeTeam, data.awayTeam);
      });
    });
  };

  drawScreen();
}
